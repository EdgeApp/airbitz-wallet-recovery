// Utility to Recover funds from an Airbitz HD Seed.

var bitcore = require('bitcore');
var api = "https://insight.bitpay.com/api/";
var sweepUnconfirmed = true;

var HDPrivateKey = bitcore.HDPrivateKey;
var index;
var addressBlock = [];
var privKeySet = [];
var address;
var derived;
var minerFee = 0.0005;
var utos = []; // Everything spendable in HD Seed
var totalBalance = 0, tbInSatoshis = 0;
var blockSize = 50; // Chunk of addresses to check for at a time.

var hdPrivateKey;
var bitcoinB = '\u0E3F'; var mBitcoin = 'm'+'\u0E3F';

var empty = "Invalid entropy: must be an hexa string or binary buffer, got ", emptyResponse = "No Seed";
var invalidSeed = "Invalid entropy: at least 128 bits needed, got \"�\"", invalidResponse = "Invalid Seed";

function processSeed(prs){
	$(".error-screen").addClass( "hidden"); // Hide
	$(".loading-screen").toggleClass( "hidden"); // Show
	console.log("Start");
	
	index = 0;
	addressBlock = [];
	privKeySet = [];
	utos = [];
	totalBalance = 0;
	
	hdPrivateKey = new HDPrivateKey.fromSeed(prs);
	
	getAddresses();
}

function getAddresses(){
	for(var x = 0;x <= blockSize ;x++){
		// Derive the next address.
		derived = hdPrivateKey.derive("m/0/0/" + index.toString());
		address = derived.privateKey.toAddress();
		privKeySet.push(derived.privateKey.toWIF());
		addressBlock[x] = address.toString();
		
		index++;
	}
	getUTXOs(addressBlock);
}

function getUTXOs(arrayOfAddresses){
	arrayOfAddresses = arrayOfAddresses.join(); // Comma seperated addys.
	$.get(api + "addrs/" + arrayOfAddresses + "/utxo", function( data ) {
		extractUTOs(data);
		checkAddresses();
	});
}
function extractUTOs(data){
	for(x in data){
		utos.push(data[x]);
	}
}

function checkAddresses(){
	// Check that the addy has had money sent to it. i.e. been used.
	$.ajax({
		 async: true,
		 type: 'GET',
		 url: api + "addr/" + addressBlock[addressBlock.length-1] + "/totalReceived",
		 success: function(data) {
			 var totalReceived = data;
			 var unconfirmed = 0;
				$.get( api + "addr/" + addressBlock[addressBlock.length-1] + "/unconfirmedBalance", function( data ) {
					if(sweepUnconfirmed){
						if(data >= 0) { unconfirmed = data };
					}
					if((totalReceived + unconfirmed) > 0){
						getAddresses();
				 } else {
					 getBalance(utos);
					 var totalToSend = totalBalance - minerFee;
					 $(".balance").text("Total To Send: " + bitcoinB + " " + totalToSend );
					 $(".loading-screen").toggleClass("hidden"); // Hide
				 }
				});
		}
	});
}
function getBalance(arrayOfUtos){
	for(x in arrayOfUtos){
			totalBalance += arrayOfUtos[x].amount;
	}
	return totalBalance;
}
function sweepFunds(toBTCAddy){
	console.log("Start Sweep");
	var transaction = createTransaction(toBTCAddy);
	console.log(transaction.serialize() );
  
  $.post(  api + "tx/send", transaction.serialize())
  .done(function( data ) {
    alert( "Transaction Sent: " + data );
  });
}
function createTransaction(addy){
    console.log("Miner Fee: " + btcToSatoshis(minerFee))
	var transaction = new bitcore.Transaction()
    .from(utos)          
    .to(addy, btcToSatoshis(totalBalance))
    .change(addy) // Send everything, even change for sweep
    .fee(btcToSatoshis(minerFee))
    .sign(privKeySet);
    return transaction;
}

function transErr(e){
	
	var response = "";
	
	switch(e) {
		case empty:
			response = emptyResponse;
			break;
		case invalidSeed: // To do, catch all Invalid seed error messages
			response = invalidResponse;
			break;
		default:
			response = e;
	}
	return response;
}

function btcToSatoshis(btcAmt){
    return bitcore.Unit.fromBTC(btcAmt).toSatoshis()
}

$(function() {
	$( "#recover-button" ).click(function() {
		var input = $("#masterSeed").val();
		try{
			processSeed(input);
		} catch(e) {
			var errMes = transErr(e.message);
			console.log(e.message);
			$(".loading-screen").toggleClass( "hidden"); // Hide
			$(".error-screen").toggleClass( "hidden");
			$(".error-message").text(errMes);
		}
	});
	
	$("#sweep").click(function() {
		var userAddy = $("#btcAddy").val();
		sweepFunds(userAddy);
	});
});
