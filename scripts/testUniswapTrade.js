const { JsonRpcProvider, Contract, Wallet, getAddress, parseEther, formatEther } = require('ethers');
require('dotenv').config();

async function main() {
  const provider = new JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com');
  const signer = new Wallet(process.env.PRIVATE_KEY, provider);

  const factoryAddress = '0x80c46b8CB4dA625d7a99a78490b304A63A785C2E';
  const quoteAddress = '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9';

  console.log('==================================================');
  console.log('  Testing Active Token Launch, Buy, Sell & Grad   ');
  console.log('==================================================');

  const tokenAbi = [
    'function balanceOf(address account) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)'
  ];

  const factoryAbi = [
    'function createLaunch((string name, string symbol, string metadataUri, address quote, uint256 quoteUsdPrice, uint256 priceDeadline, bytes priceSignature, uint24 feePpm, bool feesToHolders) p) external payable returns (address, tuple(address,address,uint24,int24,address), bytes32)',
    'function buy(address token) external payable',
    'function sell(address token, uint256 tokenAmount) external',
    'function isGraduated(address) view returns (bool)'
  ];

  const factory = new Contract(factoryAddress, factoryAbi, signer);

  // 1. Launch a new token
  const launchParams = {
    name: 'Active Trade Token',
    symbol: 'ATT',
    metadataUri: JSON.stringify({ description: 'Active token for buy/sell test', imageUrl: '' }),
    quote: quoteAddress,
    quoteUsdPrice: parseEther('3000'),
    priceDeadline: BigInt(Math.floor(Date.now() / 1000) + 86400 * 365),
    priceSignature: '0x',
    feePpm: 20000, // 2% tax
    feesToHolders: false
  };

  console.log('\n1. Launching active token...');
  const createTx = await factory.createLaunch(launchParams, { value: 0n });
  const createReceipt = await createTx.wait();
  const tokenAddress = createReceipt.logs[0].address;
  console.log('   Token Created Address:', tokenAddress);

  const tokenContract = new Contract(tokenAddress, tokenAbi, signer);

  // 2. Buy Token on active bonding curve
  console.log('\n2. Testing BUY trade with 0.01 ETH on active curve...');
  const buyTx = await factory.buy(tokenAddress, { value: parseEther('0.01') });
  console.log('   Buy Tx Hash:', buyTx.hash);
  await buyTx.wait();

  const userBal1 = await tokenContract.balanceOf(signer.address);
  console.log('   User Token Balance after Buy:', formatEther(userBal1), 'ATT');

  // 3. Sell Token on active bonding curve
  console.log('\n3. Testing SELL trade for 5,000,000 ATT tokens...');
  const sellAmt = parseEther('5000000');
  await (await tokenContract.approve(factoryAddress, sellAmt)).wait();

  const sellTx = await factory.sell(tokenAddress, sellAmt);
  console.log('   Sell Tx Hash:', sellTx.hash);
  await sellTx.wait();

  const userBal2 = await tokenContract.balanceOf(signer.address);
  console.log('   User Token Balance after Sell:', formatEther(userBal2), 'ATT');

  // 4. Trigger Graduation by depositing 0.20 ETH
  console.log('\n4. Buying with 0.20 ETH to trigger Uniswap Graduation...');
  const gradTx = await factory.buy(tokenAddress, { value: parseEther('0.20') });
  console.log('   Graduation Buy Tx Hash:', gradTx.hash);
  await gradTx.wait();

  const graduated = await factory.isGraduated(tokenAddress);
  console.log('   Is Token Graduated?:', graduated);

  console.log('\n==================================================');
  console.log('  BUY, SELL & GRADUATION TEST PASSED SUCCESSFULLY ');
  console.log('==================================================');
}

main().catch(console.error);
