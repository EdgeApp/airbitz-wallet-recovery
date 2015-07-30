// Utility to Recover funds from an Airbitz HD Seed.

var bitcore = require('bitcore');
var Insight = require('bitcore-explorers').Insight;
var insight = new Insight();

var api = "https://insight.bitpay.com/api/";
var sweepUnconfirmed = true;
var HDPrivateKey = bitcore.HDPrivateKey;
var index;
var seedPros = 0;
var addressBlock = [];
var privKeySet = [];
var hidePrk = "Hide Private Key", showPrk = "Show Private Key";
var hideAllKeys = "Hide All Keys", showAllKeys = "Show All Keys";
var keysToggeled = false; //All keys toggeled.
var address;
var firstSeedAddr;
var derived;
var minerFee = 0.0005;
var utos = []; // Everything spendable in HD Seed
var totalBalance = 0, tbInSatoshis = 0;
var blockSize = 200; // Chunk of addresses to check for at a time. Not to be confused with Bitcoin Blocks
var seedData = []; // For the table
var dataTable; // DataTable Object

// Per address
var unconfirmed = 0;
var totalReceived;
var used = true; // By default, assume addrs are used.

var hdPrivateKey;
var bitcoinB = '\u0E3F'; var mBitcoin = 'm'+'\u0E3F'; var bits = "b";
var liBxNum = 0; var qrIndx = "qrcode-";
var liBxNam = qrIndx + liBxNum; //Lightbox name
var qrCodeIcon = getLiBx();

var empty = "Invalid entropy: must be an hexa string or binary buffer, got ", emptyResponse = "No Seed";
var invalidSeed = "Invalid entropy: at least 128 bits needed, got \"�\"", invalidResponse = "Invalid Seed";
var networkErrMessage = "Network Connection Error";

// ** Process HD Seed ** 

function processSeed(prs){
	hdPrivateKey = new HDPrivateKey.fromSeed(prs);
	index = 0;
	
	checkSeed();
	console.log("Start Processing Private Key");
	seedPros++;
	
	addressBlock = [];
	privKeySet = [];
	utos = [];
	totalBalance = 0;
	seedData = [];
	if(seedPros > 1){ dataTable.clear() }
		else {
			createTable();
		}

		hdPrivateKey = new HDPrivateKey.fromSeed(prs);

		setAddresses();
	}

	function setAddresses(){
		for(var x = 0;x <= blockSize ;x++){
		// Derive the next address.
		derived = hdPrivateKey.derive("m/0/0/" + index.toString());
		address = derived.privateKey.toAddress();
		if(index == 0){ firstSeedAddr = address.toString(); }
		privKeySet.push(derived.privateKey.toWIF());
		addressBlock.push(address.toString());
		
		index++;
	}
	setUTXOs(addressBlock);
}

function checkSeed(){
	derived = hdPrivateKey.derive("m/0/0/" + index.toString());
}

function setUTXOs(arrayOfAddresses){
	arrayOfAddresses = getBlockAddresses(arrayOfAddresses);
	$.get(api + "addrs/" + arrayOfAddresses + "/utxo", function( data ) {
		extractUTOs(data);
		checkAddrBlock();
	})
	.fail(function() {
		showErrMessage(networkErrMessage);	
	});
}
function getBlockAddresses(arrayOfAddresses){
	var numOfAddrInBlock = (arrayOfAddresses.length - 1);
	arrayOfAddresses = arrayOfAddresses.slice((numOfAddrInBlock - blockSize),numOfAddrInBlock);
	arrayOfAddresses = arrayOfAddresses.join(); // Comma seperated addrs.
	
	return arrayOfAddresses;
}
function extractUTOs(data){
	for(x in data){
		utos.push(data[x]);
	}
}

function checkAddrBlock(){
	// Check that at least one addr in addressBlock has had money sent to it. i.e. been used.
	var startingPoint = (addressBlock.length-blockSize); // Nubmer of Addresses - Blocksize
	var lastPt = 0;
	for(var counter = 0/*50 - 50 = 0;*/; counter <= blockSize; counter++){
		lastPt = (counter + (startingPoint - 1));
		checkAddr(addressBlock[lastPt]);
		setTable(lastPt);
	}
	$("#seed-info").removeClass("hidden"); // Show table
	if(used){
		setAddresses();
	} else { // If none used in block, then assume there's no more used addrs in the Seed, finish proccess.
	finishProcessingSeed();
}
}

function setTable(tableIndex){
	updateLiBxNum();

	var hasFunds = false;
	var order = matchAddress();
	var tableAddr = (addressBlock[tableIndex] + qrCodeIcon);

	updateLiBxNum();

	var tablePrk = ("<span class=\"invisible prkText\">" + privKeySet[tableIndex] + qrCodeIcon + "</span>");
	
	if(typeof utos[order.indexOf(tableIndex)] === 'undefined'){var spendable = 0;}
	else{ spendable = utos[order.indexOf(tableIndex)].amount; }
	
	if(spendable > 0){ hasFunds = true; }

	updateTable(tableIndex,
		tableAddr,
		spendable,
		tablePrk,
		hasFunds
		);
}

function matchAddress(){
	var addressLocation = [];
	addressLocation = jQuery.map( utos, function( n, i ) {
		return addressBlock.indexOf(n.address);
	});
	return addressLocation;
}
function clearTable(){
	$("#seed-info").children("tbody").children("tr").remove(); 
}
function updateTable(seedIndex,address,amount,privateKey,hasFunds){
	var hdClass = "index-" + seedIndex;
	seedData.push([seedIndex,address,amount,privateKey, "<button class=\"btn btn-link prk\">Show Private Key</button>"]);
	dataTable.row.add(seedData[seedIndex]).draw();
	
	if(hasFunds){
		dataTable.row(seedIndex).nodes().to$().addClass('success');
	}
}

function checkAddr(addr){
	$.get( api + "addr/" + addr + "/totalReceived", function(data){
		totalReceived = data;
		unconfirmed = 0;
		if(sweepUnconfirmed){
			setUnconfirmed(addr);
		} else {
			checkIfUsed();
		}
	})
	.fail(function() {
		showErrMessage(networkErrMessage);
	});
}

function setUnconfirmed(addr){
	$.get( api + "addr/" + addr + "/unconfirmedBalance", function( data ) {
		if(data >= 0) { unconfirmed = data };
		checkIfUsed();
	})
	.fail(function() {
		showErrMessage(networkErrMessage);	
	});
}

function checkIfUsed(){
	if((totalReceived + unconfirmed) > 0){
		used = true;
	} else {
		used = false;
	}
}

function transErr(e){
	var response = "";
	
	switch(e) {
		case empty:
		response = emptyResponse;
		break;
		default:
		response = invalidResponse;
	}
	return response;
}

function finishProcessingSeed(){
	$(".table-container").removeClass("hidden");
	$(".loading-screen").toggleClass("hidden"); // Hide
	getBalance(utos);
	minerFee = getFee();
	var totalToSend = (Math.round( (totalBalance - satsToBTC(minerFee)) * 100000000) / 100000000);
	$(".balance").text("Total To Send: " + bitcoinB + " " + totalToSend + " (Transaction Fee is " + satsToBTC(minerFee) + ")" );
	console.log("Finished Processing Seed");
}

function getBalance(arrayOfUtos){
	for(x in arrayOfUtos){
		totalBalance += arrayOfUtos[x].amount;
	}
	return totalBalance;
}

// ** SWEEP FUNDS ** 

function sweepFunds(toBTCAddr){
	console.log("Start Sweep");
	var txID = "No ID";
	var transaction = createTransaction(toBTCAddr);
	txID = broadcastTx(transaction);
}

function getFee(){
	var transaction = new bitcore.Transaction()
	.from(utos)          
	.to(firstSeedAddr, btcToSats(totalBalance));

	return transaction._estimateFee();
}

function createTransaction(addr){
	transaction = new bitcore.Transaction()
	.from(utos)
	.to(addr, (btcToSats(totalBalance) - minerFee))
	.fee(minerFee)
	.sign(privKeySet);

	return transaction;
}

function broadcastTx(tx){
	insight.broadcast(tx, function(err, returnedTxId) {
		if (err) {
			// Handle errors...
			showErrMessage(err);	
		} else {
			// Mark the transaction as broadcasted
			console.log("Transaction sent: " + returnedTxId);
			alert("Transaction sent: " + returnedTxId);
			return returnedTxId;
		}
	})
}

function btcToSats(btcAmt){
	return bitcore.Unit.fromBTC(btcAmt).toSatoshis()
}

function btcToBits(btcAmt){
	return (btcAmt * 1000000);
}

function satsToBTC(satsAmt){
	return bitcore.Unit.fromSatoshis(satsAmt).toBTC();
}

function createTable(){
	var rowCount = 0;
	dataTable = $("#seed-info").DataTable(
	{
		paging: true,
		"fnDrawCallback": function( oSettings ) {
			toggleAllKeys();
		}
	});
}

function toggleAllKeys(){
	if(keysToggeled){
		$(".prkText").removeClass("invisible");
	} else {
		$(".prkText").addClass("invisible");
	}
}

function showErrMessage(errMessage){
	$(".error-screen").removeClass( "hidden");
	$(".error-message").text(errMessage);
}
function updateLiBxNum(){
	liBxNum++;
	liBxNam = "qr-pic qrcode-" + liBxNum;
	qrCodeIcon = getLiBx();
}
function getLiBx(){
	return " <i class=\"fa fa-qrcode fa-lg qrcode-icon\"><div class=\"" + liBxNam + "\"></div></i>";
}

$(function() {
	//Click Handelers
	$( "#recover-button" ).click(function() {
		$(".loading-screen").toggleClass( "hidden"); // Show
		$(".error-screen").addClass( "hidden"); // Hide
		setTimeout(function() {
			var input = $("#masterSeed").val();
			try {
        // This function can lock the UI until it starts hitting the network
        processSeed(input);
    } catch(e) {
    	console.log(e.message);
        $(".loading-screen").toggleClass( "hidden"); // Hide
        showErrMessage(e.message);
    }
}, 500);
	});
	$("#sweep").click(function() {
		var useraddr = $("#btcAddr").val();
		sweepFunds(useraddr);
	});
	$("#seed-info").on( "click", "#toggleAllKeys", function() {
		keysToggeled = (keysToggeled == false ? true : false);
		toggleAllKeys();
		$(this).text($(this).text() == hideAllKeys ? showAllKeys : hideAllKeys);
	});
	$("#seed-info").on("click", ".prk", function() { // On("Click") instead of .click() because element is created after the DOM has been created
		$(this).parent().parent().find(".prkText").toggleClass("invisible");
		$(this).text($(this).text() == hidePrk ? showPrk : hidePrk);
	});
	$("#seed-info").on("click", ".qrcode-icon", function() { // On("Click") instead of .click() because element is created after the DOM has been create
		console.log("Let there be light");
		var thisCode = ($(this).children().attr("class")).replace(" ", ".");
		var qrCodeText = $(this).parent().text();
		console.log(thisCode);
		var codeImage = $("." + thisCode).qrcode(qrCodeText);

		BootstrapDialog.show({
			size: BootstrapDialog.SIZE_WIDE,
            title: qrCodeText,
            message: codeImage
        });
		thisCode = thisCode.replace(".", " ");
		$(this).append("<div class=\"" + thisCode + "\"></div>");
		
	});
});
