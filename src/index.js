// Utility to Recover funds from an Airbitz HD Seed.

var bitcore = require('bitcore');
var Insight = require('bitcore-explorers').Insight;
var insight = new Insight();

var api = "https://insight.bitpay.com/api/";
var insightAddr = "https://insight.bitpay.com/address/";
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
var minerFee = 10000;
var utos = []; // Everything spendable in HD Seed
var totalBalance = 0, tbInSatoshis = 0;
var blockSize = 50; // Chunk of addresses to check for at a time. Not to be confused with Bitcoin Blocks
var seedData = []; // For the table
var seedTable; // seedTable Object

// Per address
var unconfirmed = 0;
var totalReceived;
var exchangeRate = 300;
var used = true; // By default, assume addrs are used.
var tran = {
	create : function(addr) {
		tran = new bitcore.Transaction()
		.from(utos)
		.to(addr, (totalBalance - minerFee))
		.fee(minerFee)
		.sign(privKeySet);

		return tran;
	},
	sign : function(tran) {

	},
	getFee : function() {
		var tran = new bitcore.Transaction()
		.from(utos)
		.to(firstSeedAddr, totalBalance);

		return tran._estimateFee();
	}
}
var units = {
	names: ["satoshis","bits","mBTC","BTC","USD"],
	selected:"bits",
	satoshis:"/1",
	bits:"/100",
	mBTC:"/100000",
	BTC:"/100000000",
	USD: function(){
		// TODO Fetch price
		 $.ajax({
		 	url: "https://api.coinbase.com/v2/prices/buy?currency=USD", 
		 	type: "GET",
		 	crossDomain: true,
		 	success: function( data ){
				exchangeRate = data.amount;
			},
			error: function() {
			showMessage(errMeses.networkErr);
			}
		});
		return exchangeRate;
	},
	convert: function(satsAmt){
		var unitAmt = bitcore.Unit.fromSatoshis(satsAmt);
		var spacing = " ";
		switch(this.selected){
			case "bits":
				unitAmt = unitAmt.bits + spacing + this.names[1];
				break;
			case "mBTC":
				unitAmt = unitAmt.mBTC + spacing + this.names[2];
				break;
			case "BTC":
				unitAmt = unitAmt.BTC + spacing + this.names[3];
				break;
			case "USD":
				this.USD();
				unitAmt = unitAmt.to(exchangeRate) + spacing + this.names[4];
				break;
			default:
				break;
		}
		return unitAmt;
	},
	update: function(unitToUpdate){
		// Nav bar
		units.selected = $(unitToUpdate).text();
		$( ".selected" ).text(units.selected);
		$( ".selected-dropdown" ).html(units.selected + html.elements.dropdown);
		$( ".selected-unit" ).removeClass("selected-unit");
		$( unitToUpdate ).parent().addClass("selected-unit");
		// Body
		var curName = "." + classNames.currenyUnit;
		$( curName ).each( function() {
			$( this ).replaceWith( currElement.set( $( this ).attr("sats") ));
		});
	}
};

var hdPrivateKey;
var bitcoinB = '\u0E3F'; var mBitcoin = 'm'+'\u0E3F'; var bits = "b";
var liBxNum = 0; var qrIndx = "qrcode-";
var liBxNam = qrIndx + liBxNum; //Lightbox name
var qrCodeIcon = getLiBx();

var errMeses = {
	noSeed: "Please input a seed first",
	noAddr: "Please input your address",
	invalidSeed: "Invalid Seed",
	networkErr: "Network Connection Error"
}
var html = {
	isEnabled : function(selector) {
		if( !$( selector ).hasClass( "disabled" ) ){
			return true;
		} else {
			return false;
		}
	},
	show : function(selector) {
		$( selector ).removeClass( classNames.noDisplay );
	},
	hide : function(selector) {
		$( selector ).addClass( classNames.noDisplay );
	},
	enableInput : function(input,button) {
		if( $( input ).val() ){
			$( button ).attr("class","btn btn-large waves-effect waves-light");
		} else {
			$( button ).attr("class","btn btn-large disabled");
		}
	},
	display : {
		head: "Load Seed to Get Balance"
	},
	idNames : {
		userSeed: "masterSeed",
		seedInfo: "seed-info",
		searchSeed: "search",
		load: "recover-button",
		sweep: "sweep-funds",
		userAddr: "btcAddr"
	},
	classNames : {
		head: "balance",
		currenyUnit: "curreny-unit",
		noDisplay: "gone",
		checkMark: "done",
		hide: "invisible",
		seed: "seed-form",
		hasFunds: "has-funds",
		sweep: "sweep-form",
		info: "seed-info",
		reset: "new-seed",
		waves: "waves-effect"
	},
	elements : {
		dropdown: "<i class=\"material-icons right\">arrow_drop_down</i>",
		curr : {
			start: function(sats) {
				return "<span class=\"" + html.classNames.currenyUnit + "\"" + "sats=\"" + sats + "\">";
			},
			end: "</span>",
			set: function (sats) {
				return this.start(sats) + units.convert(sats) + this.end;
			}
		},
		table : {
			//seedInfo: 
			search: function(tb, query) {
				tb.search( query ).draw();
			},
			clear: function(tb) {
				console.log("Cleared!");
				$(tb).children("tbody").children("tr").remove();
			},
			setPg: function(tb,pageNum) {
				pageNum = parseInt(pageNum);			
				tb.page( pageNum ).draw( false ); /* do a standing redraw. Without this parameter, draw()
				 will do a full draw resulting in the paging being reset back to the first page! */
			},
			page: function(tb,pageButt,direction) {
				var pageButt = ( $( pageButt ).siblings(".active").attr( "page" ) - 1 ) // Page number starts at 0
				if( html.isEnabled(pageButt) ) {
					var curPgNum = table.curPg(tb);
					if( curPgNum > 0 || "next" || curPgNum < table.getNumPgs || "previous" ) {
						tb.page( direction ).draw(false);
						curPgNum = table.curPg(tb);
						$( ".pagination > .active" ).removeClass( "active " );
						$(  "[page=\"" + (curPgNum + 1) + "\"]" ).addClass("active");
					}
					table.adjustIncrements(tb);
				}
			},
			adjustIncrements: function(tb) {
				if( this.curPg(tb) <= 0 ) {
					$( ".prev-page" ).addClass("disabled").removeClass(classNames.waves);
				} else {
					$( ".prev-page" ).removeClass("disabled").addClass(classNames.waves);
				}
				if( this.curPg(tb) >= this.getNumPgs(tb) ) {
					$( ".next-page" ).addClass("disabled").removeClass(classNames.waves);
				} else {
					$( ".next-page" ).removeClass("disabled").addClass(classNames.waves);
				}
			},
			getNumPgs: function(tb) { // Get total number of pages avaliable
				return tb.page.info().pages - 1;
			},
			curPg: function(tb) {
				return tb.page();
			},
			numOfPgs: {}
		}
	},
	newSeed: function() {
		this.hide( "." + classNames.sweep );
		this.hide( "." + classNames.info );
		$( "." + classNames.head ).text(this.display.head);
		$( "#" + this.idNames.userSeed ).val("");
		this.show( "." + classNames.seed );
		seedTable.destroy();
		table.clear( "#" + idNames.seedInfo );
		clearSeed();
	}
};
var classNames = html.classNames, idNames = html.idNames;
var hideClass = classNames.hide;
var docElements = html.elements;
var table = docElements.table;
var currElement = docElements.curr;

function clearSeed() {
	addressBlock.length = 0;
	privKeySet.length = 0;
	utos.length = 0;
	totalBalance = 0;
	seedData.length = 0;
}

// ** Process HD Seed ** 
function processSeed(prs) {
	hdPrivateKey = new HDPrivateKey.fromSeed(prs);
	index = 0;
	checkSeed();

	console.log("Start Processing Private Key");
	seedPros++;
	clearSeed();
	
	if(seedPros > 1){ table.clear( "#" + idNames.seedInfo ) }
		else {
			createTable();
		}

		hdPrivateKey = new HDPrivateKey.fromSeed(prs);

		setAddresses();
	}

function setAddresses(){
	for(var x = 0;x <= blockSize ;x++){
		var nextPrk = getNextPrk();
		address = nextPrk.toAddress();
		if(index == 0){ firstSeedAddr = address.toString(); }
		privKeySet.push(nextPrk.toWIF());
		addressBlock.push(address.toString());
		
		index++;
	}
	setUTXOs(addressBlock);
}
function getNextPrk(){
	// Derive the next address.
	derived = hdPrivateKey.derive("m/0/0/" + index.toString());
	var nextPrk = derived.privateKey;
	return nextPrk
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
		showMessage(errMeses.networkErr);
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
		data[x].amount = btcToSats(data[x].amount); // Set amount to satoshis
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
	$( "#" + idNames.seedInfo ).removeClass(hideClass); // Show table
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
	var addrLink = "<a target=\"0\" href=\"" + insightAddr + addressBlock[tableIndex] + "\">";
	var link2 = "</a>";
	var tableAddr = (qrCodeIcon + (addrLink + addressBlock[tableIndex] + link2) );
	updateLiBxNum();

	var tablePrk = ("<span class=\"invisible prkText\">" + qrCodeIcon + privKeySet[tableIndex] + "</span>");
	
	if(typeof utos[order.indexOf(tableIndex)] === 'undefined'){var spendable = currElement.set(0);}
	else {
		spendable = currElement.set(utos[order.indexOf(tableIndex)].amount);
	}
	
	if(spendable > 0){ hasFunds = true; }

	updateTable(tableIndex,
		tableAddr,
		spendable,
		tablePrk,
		hasFunds
		);
}

function matchAddress() {
	var addressLocation = [];
	addressLocation = jQuery.map( utos, function( n, i ) {
		return addressBlock.indexOf(n.address);
	});
	return addressLocation;
}

function updateTable(seedIndex,address,amount,privateKey,hasFunds) {
	var hdClass = "index-" + seedIndex;
	seedData.push([seedIndex,address,amount,privateKey, "<button class=\"btn btn-link prk\">Show Private Key</button>"]);
	seedTable.row.add(seedData[seedIndex]).draw();
	
	if(hasFunds) {
		console.log(seedIndex);
		seedTable.row(seedIndex).nodes().to$().addClass( classNames.hasFunds );
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
		showMessage(errMeses.networkErr);
	});
}

function setUnconfirmed(addr){
	$.get( api + "addr/" + addr + "/unconfirmedBalance", function( data ) {
		if(data >= 0) { unconfirmed = data };
		checkIfUsed();
	})
	.fail(function() {
		showMessage(errMeses.networkErr);	
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
	$(".loading-screen").addClass( classNames.noDisplay ); // Hide
	$( "." + classNames.checkMark ).fadeIn(2000, function(){
		$( this ).fadeOut();
		$(".table-container").removeClass( classNames.noDisplay );
	});
	getBalance(utos);
	minerFee = tran.getFee();
	var totalToSend = totalBalance - minerFee;
	if( totalToSend <= 0 ) { totalToSend = 0; }
	var disToSend = currElement.set(totalToSend);
	var disFee = currElement.set(minerFee);

	$(".balance").html("Total To Send: " + disToSend + " <br>(Transaction Fee is " + disFee + ")" );
	html.show( "." + classNames.sweep );

	table.numOfPgs = table.getNumPgs(seedTable);
	console.log(table.getNumPgs(seedTable));
	console.log("Finished Processing Seed");
}

function getBalance(arrayOfUtos){
	for(x in arrayOfUtos){
		totalBalance += arrayOfUtos[x].amount;
	}
	return totalBalance;
}

// ** SWEEP FUNDS ** 
function sweepFunds(addr){
	console.log("Start Sweep");
	var txID = "No ID";
	var transaction = tran.create(addr);
	txID = broadcastTx(transaction);
}

function broadcastTx(tx){
	insight.broadcast(tx, function(err, returnedTxId) {
		if (err) {
			// Handle errors...
			showMessage(err);	
		} else {
			// Mark the transaction as broadcasted
			console.log("Transaction sent: " + returnedTxId);
			Materialize.toast("Transaction sent: " + returnedTxId,5000);
			return returnedTxId;
		}
	})
}

function btcToSats(btcAmt){
	return bitcore.Unit.fromBTC(btcAmt).toSatoshis()
}

function createTable() {
	seedTable = $("#seed-info").DataTable(
	{
		paging: true,
		"sDom": '<"top"i>rt<"bottom"l><"clear">',
		//searching: false, // No built-in search bar. Make custom
		bLengthChange: false, // No "Show entries dropdown"
		"fnDrawCallback": function( oSettings ) {
			toggleAllKeys();
		}
	});
}

function toggleAllKeys(){
	if(keysToggeled){
		$(".prkText").removeClass(hideClass);
	} else {
		$(".prkText").addClass(hideClass);
	}
}

function showMessage(errMessage,duration){
	if(!duration){
		duration = 3000; // By default, wait 3 secs.
	}
	Materialize.toast(errMessage,duration);
}
function updateLiBxNum(){
	liBxNum++;
	liBxNam = "qr-pic qrcode-" + liBxNum;
	qrCodeIcon = getLiBx();
}
function getLiBx(){
	return " <i class=\"fa fa-qrcode fa-lg qrcode-icon\"><div class=\"" + liBxNam + "\"></div></i> ";
}

$(function() {
	//Handelers
	$( ".unit-selector" ).click(function() {
		units.selected = $( this ).text();
		units.update(this);
	});
	$( "#" + idNames.userSeed ).on('input',function(e){
		html.enableInput(this, "#" + idNames.load );
    });
    $( "#" + idNames.userAddr ).on('input',function(e){
    	html.enableInput(this, "#" + idNames.sweep );
    });
    $( "#" + idNames.searchSeed ).on('input',function(e){
    	table.search(seedTable, $( this ).val() );
    });
	$( "#recover-button" ).click(function() {
		if( !$( this ).hasClass( "disabled" ) ){
			$(".balance").text("Checking seed...");
			$(".seed-form").addClass( classNames.noDisplay );
			$(".loading-screen").removeClass( classNames.noDisplay ); // Show
			setTimeout(function() {
				var input = $("#masterSeed").val();
				try {
			        // This function can lock the UI until it starts hitting the network
			        processSeed(input);
			    } catch(e) {
			    	console.log( e.message );
			        $(".loading-screen").addClass( classNames.noDisplay ); // Hide
			        $(".balance").text("Load Seed to Get Balance");
			        $(".seed-form").removeClass( classNames.noDisplay );
			        showMessage( errMeses.invalidSeed );
			    }
			}, 500);
		} else {
			showMessage( errMeses.noSeed );
			console.log("Please input your seed first.");
		}
	});
	$( "." + classNames.reset ).click(function() {
		html.newSeed();
	});
	$( "#sweep-funds" ).click(function() {
		if( !$( this ).hasClass( "disabled" ) ){
			var useraddr = $("#btcAddr").val();
			sweepFunds(useraddr);
		} else {
			showMessage( errMeses.noAddr );
		}
	});
	$( "." + idNames.seedInfo ).on( "click", "#toggleAllKeys", function() {
		keysToggeled = (keysToggeled == false ? true : false);
		toggleAllKeys();
		$(this).text($(this).text() == hideAllKeys ? showAllKeys : hideAllKeys);
	});
	$( "." + idNames.seedInfo ).on("click", ".prk", function() { // On("Click") instead of .click() because element is created after the DOM has been created
		$(this).parent().parent().find(".prkText").toggleClass(hideClass);
		$(this).text($(this).text() == hidePrk ? showPrk : hidePrk);
	});
	$( "." + idNames.seedInfo ).on("click", ".qrcode-icon", function() {
		console.log("Let there be light");
		var thisCode = ($(this).children().attr("class")).replace(" ", ".");
		var qrCodeText = $(this).parent().text();
		console.log(thisCode);
		var codeImage = $("." + thisCode).qrcode(qrCodeText);

		BootstrapDialog.show({
			size: BootstrapDialog.SIZE_LARGE,
            title: qrCodeText,
            message: codeImage
        });
		thisCode = thisCode.replace(".", " ");
		$(this).append("<div class=\"" + thisCode + "\"></div>");
	});
	$( "." + idNames.seedInfo).on("click", ".page-num", function() {
		var pageButt = ( $( this ).attr( "page" ) - 1 ) // Page number starts at 0
		table.setPg( seedTable,pageButt );
		$( this ).siblings(".active").removeClass( "active" );
		$( this ).addClass( "active" );
		table.adjustIncrements(seedTable);
	});
	$( "." + idNames.seedInfo).on("click", ".prev-page", function() {
		table.page(seedTable, this, "previous");
	});
	$( "." + idNames.seedInfo).on("click", ".next-page", function() {
		table.page(seedTable, this, "next");
	});
});
