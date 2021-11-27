// SPDX-License-Identifier: agpl-3.0
pragma solidity >=0.6.12;

import './Ownable.sol';
import {FlashLoanReceiverBase} from './FlashLoanReceiverBase.sol';
import {ILendingPool, ILendingPoolAddressesProvider, IERC20, IUniswapV2Router02} from './Interfaces.sol';
import {SafeMath} from './Libraries.sol';

/*
 * A contract that liquidates an aave loan using a flash loan:
 *
 *   call executeFlashLoans() to begin the liquidation
 *
 */
contract LiquidateLoan is FlashLoanReceiverBase, Ownable {
  IUniswapV2Router02 public immutable swapRouter;
  using SafeMath for uint256;

  event ErrorHandled(string stringFailure);

  // instantiate lending pool addresses provider and get lending pool address
  constructor(
    ILendingPoolAddressesProvider _addressProvider,
    IUniswapV2Router02 _uniswapV2Router
  ) public FlashLoanReceiverBase(_addressProvider) {
    // instantiate swap router to handle exchange
    swapRouter = _uniswapV2Router;
  }

  /**
        This function is called after your contract has received the flash loaned amount
     */
  function executeOperation(
    address[] calldata assets,
    uint256[] calldata amounts,
    uint256[] calldata premiums,
    address, /* initiator */
    bytes calldata params
  ) external override returns (bool) {
    // collateral - the address of the token that we will be compensated in
    // userToLiquidate - id of the user to liquidate
    // swapPath - path for uniswap
    (
      address collateral,
      address userToLiquidate,
      address[] memory swapPath
    ) = abi.decode(params, (address, address, address[]));

    // liquidate unhealthy loan
    uint256 loanAmount = amounts[0];
    address loanAsset = assets[0];
    uint256 flashloanFee = premiums[0];
    uint256 flashLoanRepayment = loanAmount.add(flashloanFee);

    liquidateLoan(collateral, loanAsset, userToLiquidate, loanAmount);

    // swap collateral from collateral back to loan asset from flashloan to pay it off
    if (collateral != loanAsset) {
      // require at least the flash loan repayment amount out as a safety
      swapCollateral(collateral, flashLoanRepayment, swapPath);
    }

    // Pay to owner the profits
    uint256 profit = IERC20(loanAsset).balanceOf(address(this)).sub(
      flashLoanRepayment
    );
    require(profit > 0, 'No profit');
    require(
      IERC20(loanAsset).transfer(owner(), profit),
      'profit transfer error'
    );

    // Approve the LendingPool contract to *pull* the owed amount + premiums
    require(
      IERC20(loanAsset).approve(address(_lendingPool), flashLoanRepayment),
      'flash loan repayment error'
    );

    return true;
  }

  function liquidateLoan(
    address _collateral,
    address _reserve,
    address _user,
    uint256 _amount
  ) private {
    require(
      IERC20(_reserve).approve(address(_lendingPool), _amount),
      'liquidate loan approval error'
    );
    _lendingPool.liquidationCall(_collateral, _reserve, _user, _amount, false);
  }

  // assumes the balance of the token is on the contract
  function swapCollateral(
    address collateral,
    uint256 amountOutMin,
    address[] memory swapPath
  ) private {
    IERC20 collateralToken = IERC20(collateral);
    uint256 amountToTrade = collateralToken.balanceOf(address(this));

    // grant swap access to your token, swap ALL of the collateral over to the debt asset
    require(
      collateralToken.approve(address(swapRouter), amountToTrade),
      'swap approval error'
    );

    // Trade 1: Execute swap from collateral into designated ERC20 token on swap
    try
      swapRouter.swapExactTokensForTokens(
        amountToTrade,
        amountOutMin,
        swapPath,
        address(this),
        block.timestamp + 10
      )
    {} catch Error(string memory reason) {
      // for debugging, swallow the error
      emit ErrorHandled(reason);
    } catch {}
  }

  /*
   * This function is manually called to commence the flash loans sequence
   * to make executing a liquidation  flexible calculations are done outside of the contract and sent via parameters here
   * _assetToLiquidate - the token address of the asset that will be liquidated
   * _flashAmt - flash loan amount (number of tokens) which is exactly the amount that will be liquidated
   * _collateral - the token address of the collateral. This is the token that will be received after liquidating loans
   * _userToLiquidate - user ID of the loan that will be liquidated
   * _swapPath - the path that uniswap will use to swap tokens back to original tokens
   */
  function executeFlashLoans(
    address _assetToLiquidate,
    uint256 _flashAmt,
    address _collateral,
    address _userToLiquidate,
    address[] memory _swapPath
  ) public onlyOwner {
    address receiverAddress = address(this);

    // the various assets to be flashed
    address[] memory assets = new address[](1);
    assets[0] = _assetToLiquidate;

    // the amount to be flashed for each asset
    uint256[] memory amounts = new uint256[](1);
    amounts[0] = _flashAmt;

    // 0 = no debt, 1 = stable, 2 = variable
    uint256[] memory modes = new uint256[](1);
    modes[0] = 0;

    // mode is set to 0, no debt will be accrued
    address onBehalfOf = address(this);

    // passing these params to executeOperation so that they can be used to liquidate the loan and perform the swap
    bytes memory params = abi.encode(_collateral, _userToLiquidate, _swapPath);
    uint16 referralCode = 0;

    _lendingPool.flashLoan(
      receiverAddress,
      assets,
      amounts,
      modes,
      onBehalfOf,
      params,
      referralCode
    );
  }
}
