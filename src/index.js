// Utility to Recover funds from an Airbitz HD Seed.
var bitcore = require('bitcore');
var Insight = require('bitcore-explorers').Insight;
var insight = new Insight();

var api = "https://insight.bitpay.com/api/";
var insightAddr = "https://insight.bitpay.com/address/";
var sweepUnconfirmed = true;
var HDPrivateKey = bitcore.HDPrivateKey;
var hidePrk = "Hide Key", showPrk = "Show Key";
var hideAllKeys = "Hide All", showAllKeys = "Show All";
var keysToggeled = false; //All keys toggeled.
var minerFee = 10000; // Default miner fee
var blockSize = 50; // Chunk of addresses to check for at a time. Not to be confused with Bitcoin Blocks
var seedTable; // seedTable Object
// Per address
var exchangeRate = 300;
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

var actions = {
	"select-unit": function (event) {
		units.selected = $( this ).text();
	  	units.update(this);
	  },
	recover: function (event) { 
	  	if( !$( this ).hasClass( "disabled" ) ){
	  		docElements.loading.show();
	  		setTimeout(function() {
	  			var input = $("#masterSeed").val();
	  			try {
	  		        // This function can lock the UI until it starts hitting the network
	  		        seed.process(input);
	  		    } catch(e) {
	  		    	console.log( e.message );
	  		    	docElements.loading.hide();
	  		    	docElements.header.reset();
	  		    	html.show(".seed-form");
	  		        docElements.showMes( errMeses.invalidSeed );
	  		    }
	  		}, 500);
	  	} else {
	  		docElements.showMes( errMeses.noSeed );
	  		console.log("Please input your seed first.");
	  	}
  },
  "new-seed": function(event) {
  	html.newSeed();
  },
  sweep: function(event) {
  	if( !$(this).hasClass( "disabled" ) ) {
  		var useraddr = $("#btcAddr").val();
  		sweepFunds(useraddr);
  	} else {
  		docElements.showMes( errMeses.noAddr );
  	}
  },
  search: function(event) {
  	table.search(seedTable, $( this ).val() );
  },
  enableLoad: function(event) {
  	html.enableInput(this, "#" + idNames.load );
  },
  enableSweep: function(event) {
  	html.enableInput(this, "#" + idNames.sweep );
  }
};
var tran = {
	create : function(toAddr,utos) {
		tran = new bitcore.Transaction()
		.from(utos)
		.to(toAddr, (totalBalance - minerFee))
		.fee(minerFee)
		.sign(privKeySet);

		return tran;
	},
	sign : function() {}, // TODO Sign a transaction
	getFee : function(utos,amount) { // Get estimated transaction fee
		var tran = new bitcore.Transaction()
		.from(utos)
		.to(firstSeedAddr, amount);

		return tran._estimateFee();
	}
};
var units = {
	names: ["satoshis","bits","mBTC","BTC","USD"],
	selected:"bits",
	satoshis:"/1",
	bits:"/100",
	mBTC:"/100000",
	BTC:"/100000000",
	USD: function(){
		 $.ajax({
		 	url: "https://api.coinbase.com/v2/prices/buy?currency=USD", 
		 	type: "GET",
		 	crossDomain: true,
		 	success: function( data ){
				exchangeRate = data.amount;
			},
			error: function() {
			//docElements.showMes(errMeses.networkErr);
			}
		});
		return exchangeRate;
	},
	convert: function(satsAmt){
		var unitAmt = bitcore.Unit.fromSatoshis(satsAmt);
		switch(this.selected){
			case "bits":
				unitAmt = unitAmt.bits + " " + this.names[1];
				break;
			case "mBTC":
				unitAmt = unitAmt.mBTC + " " + this.names[2];
				break;
			case "BTC":
				unitAmt = unitAmt.BTC + " " + this.names[3];
				break;
			case "USD":
				this.USD();
				unitAmt = unitAmt.to(exchangeRate) + " " + this.names[4];
				break;
			default:
				break;
		}
		return unitAmt;
	},
	btcToSats: function(btcAmt) {
		return bitcore.Unit.fromBTC(btcAmt).toSatoshis()
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
var seed = {
	seedsProcessed: 0,
	data: [],
	checked: $.Deferred(),
	index: {},
	balance: {},
	utos: [],
	hdKey: {},
	keys: [],
	addresses: [],
	used: false,
	clear: function() {
		this.index = 0;
		this.balance = 0;
		this.checked = $.Deferred();
		this.addresses.length = 0;
		block.addresses.length = 0;
		block.keys.length = 0;
		this.utos.length = 0;
		this.data.length = 0;
	},
	check: function() {
		derived = this.hdKey.derive("m/0/0/" + this.index.toString());
	},
	reset: function(hdseed) {
		this.clear();
		this.hdKey = new HDPrivateKey.fromSeed(hdseed);
		this.check();
		console.log("Start Processing Private Key");
		uto.retrieved = $.Deferred();
		this.seedsProcessed++;
	},
	process: function(hdseed) {
		this.reset(hdseed); // Reset seed properties for new seed
		this.setTable();
		this.nextBlock();
		$.when(this.checked).done(function() {
			seed.balance = uto.getVal(seed.utos);
			seed.show();
			console.log("Finished Processing Seed");
		});
	},
	show: function() {
		minerFee = tran.getFee(seed.utos, seed.balance);
		table.setPgs(seedTable);
		$( "#" + idNames.seedInfo ).removeClass(hideClass); // Show table
		docElements.loading.hide(); // Stop loading screen.
		docElements.header.show(seed.balance, minerFee); // Show main header text
		html.show( "." + classNames.info );
		table.numOfPgs = table.getNumPgs(seedTable);
	},
	setTable: function() {
		if(this.seedsProcessed > 1) { // If we've made a seed before, clear previous table.
			//table.clear( seedTable );
		}
		createTable();
	},
	setAddresses: function() { // Set next block of addresses & keys out of HDSeed
		for(var x = 0;x <= blockSize ;x++) {
			this.setAddr();
			this.index++;
		}
	},
	setAddr: function() { // Set next single address & key out of HDSeed
		var key = this.nextKey();
		var address = key.toAddress();
		if(this.index == 0){ firstSeedAddr = address.toString(); }
		this.keys.push(key.toWIF());
		this.addresses.push(address.toString());
	},
	nextKey: function(hdPrivateKey) { // Get next private key out of HDSeed
		var derived = this.hdKey.derive("m/0/0/" + this.index.toString());
		return derived.privateKey;
	},
	nextBlock: function() { // Process next block of keys and addresses in seed.
		block.process(); // Process block
		$.when( block.checked ).done( function(hasFunds) {
			if ( hasFunds ) { // If the block had money
				console.log("Next Block");
				seed.nextBlock(); // Check next block
			} else {
				block.process();
				seed.checked.resolve(); // Finish checking
			}
		});
	},
	getInfo: function(tableIndex) {
		updateLiBxNum();
		var spendable = 0;
		var addrLink = "<a target=\"0\" href=\"" + insightAddr + seed.addresses[tableIndex] + "\">";
		var link2 = "</a>";
		var tableAddr = (qrCodeIcon + (addrLink + seed.addresses[tableIndex] + link2) );
		updateLiBxNum();
		var tablePrk = ("<span class=\"invisible prkText\">" + qrCodeIcon + seed.keys[tableIndex] + "</span>");
		if( typeof seed.utos[0] === 'undefined' ) {
			spendable = currElement.set(0);
		} else {
			spendable = currElement.set(seed.utos[0][tableIndex]);
			var thisAddr = seed.addresses[tableIndex];
		}
		return [(tableIndex+1),tableAddr,spendable,tablePrk, docElements.showKeyBut];
	}
};
var block = { // A block is an array of addresses or keys of length defined by blockSize
	addresses: {},
	keys: {},
	totalReceived: 0,
	totalUnconfirmed: 0,
	checked: $.Deferred(),
	check: function(addressSet) { // Check if block has been used.
		var startingPoint = (addressSet.length-blockSize); // Nubmer of Addresses - Blocksize
		var lastPt = 0;
		this.reset();
		var checked = 0;
		var f = function(counter) {
			if( counter <= blockSize ) {
				lastPt = (counter + (startingPoint - 1));
				seed.data.push(seed.getInfo(lastPt)); // Get seed data
				seedTable.row.add(seed.data[lastPt]).draw(); // Push seed data to table
				lastPt = (counter + (startingPoint - 1));
				$.when( block.getReceived(addressSet[lastPt]), block.getUnconfirmed(addressSet[lastPt]) )
				.done(function( received, unconfirmed) {
					block.totalReceived += received[0];
					block.totalUnconfirmed += unconfirmed[0];
					checked++;
					if( checked > blockSize ) { // Done checking all addresses in addressSet
						if( block.getTotal() > 0 ) {
							block.checked.resolve(true);
						} else {
							block.checked.resolve(false);
						}
					}
				});
				f(counter+1);
			}
		};
		f(0);
	},
	getBlock: function(array) {
		array = array.slice((array.length - blockSize),array.length); // get last block
		array = array.join(); // Comma seperated addrs.
		return array;
	},
	process: function() {
		this.set();
		this.check(seed.addresses);
	},
	set: function() { // Set utos and address for block
		uto.retrieved = $.Deferred();
		seed.setAddresses();
		uto.get(seed.addresses); // Get utos
		$.when(uto.retrieved).done(function(utos) {
			if(!(utos === undefined || utos.length == 0)) {
				seed.utos.push(utos);
			}
		});
	},
	getTotal: function() {
		return this.totalReceived + this.totalUnconfirmed;
	},
	getReceived: function(addr) { // Get total ever sent to single address
		return $.get( api + "addr/" + addr + "/totalReceived" )
		.fail(function() {
			docElements.showMes(errMeses.networkErr);
		});
	},
	getUnconfirmed: function(addr) { // Get total unconfirmed balance of single address.
		return $.get( api + "addr/" + addr + "/unconfirmedBalance")
		.fail(function() {
			docElements.showMes(errMeses.networkErr);
		});
	},
	reset: function() {
		var lastPt = 0;
		this.checked = $.Deferred();
		block.totalReceived = 0;
		block.totalUnconfirmed = 0;
	}
};
var uto = {
	retrieved: $.Deferred(),
	get: function(addressSet) { // Lookup UTOs for set of addresses
		//uto.retrieved = $.Deferred();
		addressSet = block.getBlock(addressSet);
		$.get(api + "addrs/" + addressSet + "/utxo")
		.done(function( data ) { // Data = all utos in addressSet
			//console.log(uto.extract(data));
			uto.retrieved.resolve( uto.extract(data) );
		})
		.fail(function() {
			docElements.showMes(errMeses.networkErr);
		});
	},
	extract: function(utoSet) { // 
		var extracted = [];
		for(x in utoSet) {
			utoSet[x].amount = units.btcToSats(utoSet[x].amount); // Set amount to satoshis
			extracted.push(utoSet[x]);
		}
		return extracted;
	},
	find: function(address, utoSet) {
		console.log("Find: " + address);
		var attr = 'address';
	    for(var i = 0; i < utoSet.length; i += 1) {
	    	console.log(utoSet[i][attr]);
	        if(utoSet[i][attr] === address) {
	            return i;
	        }
	    }
	},
	getVal: function(utoSet) {
		var utoVal = 0;
		for(x in utoSet[0]) {
			utoVal += utoSet[0][x].amount;
		}
		return utoVal;
	}
};
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
	getChildOfParent : function(parent,child) {
		console.log(parent,child);
		return ("." + $( $( parent ).children(( child )) )[0]["className"])
	},
	display : {
		head: "Load Seed to Get Balance",
		addr: "Bitcoin Address",
		prk: "Private Key"
	},
	idNames : {
		userSeed: "masterSeed",
		seedInfo: "seed-info",
		searchSeed: "search",
		load: "recover-button",
		sweep: "sweep-funds",
		userAddr: "btcAddr",
		qrModal: "qr-modal"
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
		pageNums: "page-nums",
		address: "bitcoin-address",
		prk: "bitcoin-private-key",
		modalContent: "modal-content",
		modalHeader: "modal-header",
		modalBody: "modal-body",
		modalMain: "modal-main",
		modalText: "modal-text",
		modalFoot: "modal-footer",
		reset: "new-seed",
		waves: "waves-effect"
	},
	elements : {
		dropdown: "<i class=\"material-icons right\">arrow_drop_down</i>",
		showKeyBut: "<button class=\"btn btn-link prk\">Show Key</button>",
		showMes: function(errMessage,duration) {
			if(!duration) {
				duration = 3000; // By default, wait 3 secs.
			}
			Materialize.toast(errMessage,duration);
		},
		curr : {
			start: function(sats) {
				return "<span class=\"" + html.classNames.currenyUnit + "\"" + "sats=\"" + sats + "\">";
			},
			end: "</span>",
			set: function (sats) {
				return this.start(sats) + units.convert(sats) + this.end;
			}
		},
		loading : {
			show: function() {
				$(".balance").text("Checking seed...");
				html.hide( ".seed-form" );
				html.show( ".loading-screen" );
			},
			hide: function() {
				html.hide( ".loading-screen" );
			},
			done: function() {
				$( "." + classNames.checkMark ).fadeIn(2000, function(){
					$( this ).fadeOut();
					table.create();
				});
			}
		},
		header : {
			reset: function() { // Set header text to default
				$(".balance").text("Load Seed to Get Balance");
			},
			show: function(totalBalance, minerFee) { // Show How much will be sent
				var totalToSend = totalBalance - minerFee;
				if( totalToSend <= 0 ) { totalToSend = 0; }
				var disToSend = currElement.set(totalToSend);
				var disFee = currElement.set(minerFee);

				$(".balance").html("Total To Send: " + disToSend + " <br>(Transaction Fee is " + disFee + ")" );
				html.show( "." + classNames.sweep );
			},
		},
		table : {
			create: function() {
				this.setPgs(seedTable);
				html.show( ".table-container" );
			},
			search: function(tb, query) {
				tb.search( query ).draw();
			},
			clear: function(tb) {
				console.log("Cleared!");
				tb.rows().remove().draw();
				$("#" + idNames.seedInfo).children("tbody").children("tr").remove();
			},
			setPg: function(tb,pageNum) { // Set pagnation to page pageNum
				pageNum = parseInt(pageNum);			
				tb.page( pageNum ).draw( false );
			},
			setPgs: function(tb) { // Set up pagnation to have up to 10 page buttons
				var numberOfPages = this.getNumPgs(tb);
				this.addPgNums( $( "." + classNames.pageNums ), numberOfPages );
			},
			addPgNums: function(numDiv, maxNum) {
				numDiv.html(""); // Make sure there's no numbered pagnation buttons.
				this.addPgNums.didrun = false;
				for(var x = 0; x <= 10 && x <= maxNum; x++) { // Max 10 #'ed buttons
					if(!this.addPgNums.didrun) {
						numDiv.html(table.firstPg);
						this.addPgNums.didrun = true;
					} else {
						numDiv.append( table.inactivePg.getInactivePage(x + 1) );
					}
				}
			},
			page: function(tb,pageButt,direction) {
				var pageButt = ( $( pageButt ).siblings(".active").attr( "page" ) - 1 ) // Page number starts at 0
				if( html.isEnabled(pageButt) ) {
					var curPgNum = table.curPg(tb);
					if( curPgNum > 0 || "next" || curPgNum < table.getNumPgs || "previous" ) {
						tb.page( direction ).draw(false);
						curPgNum = table.curPg(tb);
						$( ".pagination" ).find( ".active" ).removeClass( "active " );
						$(  "[page=\"" + (curPgNum + 1) + "\"]" ).addClass("active");
					}
					table.adjustIncrements(tb);
				}
			},
			adjustIncrements: function(tb) { // Enable and/or disable incremental buttons
				if( this.curPg(tb) <= 0 ) { // If on the first page,
					$( ".prev-page" ).addClass("disabled").removeClass(classNames.waves); // Disable - incremental
				} else {
					$( ".prev-page" ).removeClass("disabled").addClass(classNames.waves); // Otherwise, make sure it's enabled.
				}
				if( this.curPg(tb) >= this.getNumPgs(tb) ) { // If on the last page,
					$( ".next-page" ).addClass("disabled").removeClass(classNames.waves); // Disable + incremental
				} else {
					$( ".next-page" ).removeClass("disabled").addClass(classNames.waves); // Otherwise, make sure it's enabled.
				}
			},
			getNumPgs: function(tb) { // Get total number of pages avaliable
				return tb.page.info().pages - 1;
			},
			curPg: function(tb) {
				return tb.page();
			},
			numOfPgs: {},
			firstPg: "<li class=\"active page-num page-1\" page=\"1\"><a href=\"#!\">1</a></li>",
			inactivePg: {
				getInactivePage: function(pageNum) {
					this.pageNumber = pageNum;
					return "<li class=\"waves-effect page-num page-" + this.pageNumber + "\" page=\""
							+ this.pageNumber + "\"><a href=\"#!\">" + this.pageNumber + "</a></li>";
				},
				pageNumber: {}
			}
		},
		modal : {
			create: function(m, headerCont, cont) {
				this.clear(m);
				this.set( m, headerCont, cont );
				this.open(m);
			},
			open: function(m) {
				$( m ).openModal();
			},
			close: function(m) {
				this.clearContent(m);
				$( m ).closeModal();
			},
			clear: function(m) {
				$( this.header(m) ).html("");
				$( this.body(m) ).html(this.mainDiv + this.textDiv);
			},
			set: function(m, headerCont, cont) {
				$( this.header(m) ).text(headerCont);
				$( this.main(m) ).qrcode(cont);
				$( this.text(m) ).text(cont);
			},
			content: function(m) {
				return html.getChildOfParent(m, "." + classNames.modalContent);
			},
			header: function(m) {
				var content = this.content(m);
				return html.getChildOfParent(content, "." + classNames.modalHeader);
			},
			body: function(m) {
				var content = this.content(m);
				return html.getChildOfParent(content, "." + classNames.modalBody);
			},
			main: function(m) {
				var body = this.body(m);
				return html.getChildOfParent(body, "." + classNames.modalMain);
			},
			text: function(m) {
				var body = this.body(m);
				return html.getChildOfParent(body, "." + classNames.modalText);
			},
			mainDiv: "<div class=\"modal-main\"></div>",
			textDiv: "<h5 class=\"modal-text\"></h5>",
			qrCode: function() { return ("#" + idNames.qrModal) }
		}
	},
	newSeed: function() {
		this.hide( "." + classNames.sweep );
		this.hide( "." + classNames.info );
		$( "." + classNames.head ).text(this.display.head);
		$( "#" + this.idNames.userSeed ).val("");
		this.show( "." + classNames.seed );
		table.clear(seedTable);
		seedTable.destroy();

		seed.clear();
	}
};
var classNames = html.classNames, idNames = html.idNames;
var hideClass = classNames.hide;
var docElements = html.elements;
var table = docElements.table;
var currElement = docElements.curr;
function transErr(e) {
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
// ** SWEEP FUNDS ** 
function sweepFunds(addr) {
	console.log("Start Sweep");
	var txID = "No ID";
	var transaction = tran.create(addr);
	txID = broadcastTx(transaction);
}
function broadcastTx(tx){
	insight.broadcast(tx, function(err, returnedTxId) {
		if (err) {
			docElements.showMes(err);	
		} else { // Mark the transaction as broadcasted
			Materialize.toast("Transaction sent: " + returnedTxId,5000);
			return returnedTxId;
		}
	})
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
		},
		"fnRowCallback": function( nRow, aData, iDisplayIndex, iDisplayIndexFull ) {
	    	$('td:eq(1)', nRow).addClass( "bitcoin-address" );
	    	$('td:eq(3)', nRow).addClass( "bitcoin-private-key" );
		}
	});
}
function toggleAllKeys() {
	if(keysToggeled){
		$(".prkText").removeClass(hideClass);
	} else {
		$(".prkText").addClass(hideClass);
	}
}
function updateLiBxNum() {
	liBxNum++;
	liBxNam = "qr-pic qrcode-" + liBxNum;
	qrCodeIcon = getLiBx();
}
function getLiBx() {
	return " <i class=\"fa fa-qrcode fa-lg qrcode-icon\"><div class=\"" + liBxNam + "\"></div></i> ";
}
$(function() {
	$(".button-collapse").sideNav();
	//Handelers
	$("a[data-action]").on("click", function (event) {
	  var link = $(this),
	      action = link.data("action");
	  event.preventDefault();
	  if( typeof actions[action] === "function" ) {
	    actions[action].call(this, event);
	  }
	});
	$("input[data-action]").on("input", function (event) {
		var link = $(this),
			action = link.data("action");
		event.preventDefault();
		if( typeof actions[action] === "function" ) {
	    	actions[action].call(this, event);
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
		console.log("Show modal!");
		var qrCodeTxt = $(this).parent().text().replace( /\s/g, '');
		if( $( this ).parents("td").hasClass( classNames.address ) ) {
			docElements.modal.create( docElements.modal.qrCode(), html.display.addr, ("bitcoin:" + qrCodeTxt) );
		} else if ( $( this ).parents("td").hasClass( classNames.prk ) ) {
			docElements.modal.create( docElements.modal.qrCode(), html.display.prk, qrCodeTxt );
		}
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
