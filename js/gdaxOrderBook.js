var Gdax = require('gdax');
var orderbookSync = new Gdax.OrderbookSync(['ETH-USD']);
var websocket = new Gdax.WebsocketClient(['ETH-USD']);

var trade_history_amount = 0;


var tradeHistory = [];



function handleTickers(data){
	var size;
	var amount;
	if(data.type == 'match'){
		populateTradeHistory(data);
	}
}

function populateTradeHistory(data){
	if(tradeHistory.length > 100){
		//pop the top
		tradeHistory.shift();
	}
	tradeHistory.push(data);
	$('#tradeHistory0').html('');
	var start = 0;
	for(var i = tradeHistory.length - 1; i > -1; i--){
		if(start > tradeStoppingPoint){
			break;
		}
		size = Number(tradeHistory[i].size);
		if(tradeHistory[i].side == 'buy'){
			$('#tradeHistory0').append('<li class="list-group-item list-group-item-danger"><div class="row"><div class="col-xs-6 img-responsive">'
				+ size.toFixed(5) + '</div><div class="col-xs-6 img-responsive">' + tradeHistory[i].price + '</div></div></li>');
		}
		else{
			$('#tradeHistory0').append('<li class="list-group-item list-group-item-success"><div class="row"><div class="col-xs-6 img-responsive">'
				+ size.toFixed(5) + '</div><div class="col-xs-6 img-responsive">' + tradeHistory[i].price + '</div></div></li>');
		}
		start++;
	}
}

function refreshTradeHistory(){
	$('#tradeHistory0').html('');
	var start = 0;
	for(var i = tradeHistory.length - 1; i > -1; i--){
		if(start > tradeStoppingPoint){
			break;
		}
		size = Number(tradeHistory[i].size);
		if(tradeHistory[i].side == 'buy'){
			$('#tradeHistory0').append('<li class="list-group-item list-group-item-danger"><div class="row"><div class="col-xs-6 img-responsive">'
				+ size.toFixed(5) + '</div><div class="col-xs-6 img-responsive">' + tradeHistory[i].price + '</div></div></li>');
		}
		else{
			$('#tradeHistory0').append('<li class="list-group-item list-group-item-success"><div class="row"><div class="col-xs-6 img-responsive">'
				+ size.toFixed(5) + '</div><div class="col-xs-6 img-responsive">' + tradeHistory[i].price + '</div></div></li>');
		}
		start++;
	}
}
//
// for(each in tradeHistory){
// 	size = Number(tradeHistory[each].size);
// 	$('#tradeHistory0').append('<li class="list-group-item list-group-item-info"><div class="row"><div class="col-xs-6 img-responsive">'
// 		+ size.toFixed(5) + '</div><div class="col-xs-6 img-responsive">' + tradeHistory[each].price + '</div></div></li>');
// }

function trackHistory(type){
	//empty trade history
	tradeHistory = [];
	websocket.on('message', handleTickers);
}

trackHistory('eth');
// console.log(orderbookSync.book.state());

var bids = orderbookSync.book._bids;
var asks = orderbookSync.book._asks;


function changeCurrency(currency){
	if(currency == 'eth'){
		orderbookSync = new Gdax.OrderbookSync(['ETH-USD']);
		websocket = new Gdax.WebsocketClient(['ETH-USD']);
		trackHistory('eth');
		bids = orderbookSync.book._bids;
		asks = orderbookSync.book._asks;
	}
	else if (currency == 'ltc') {
		orderbookSync = new Gdax.OrderbookSync(['LTC-USD']);
		websocket = new Gdax.WebsocketClient(['LTC-USD']);
		trackHistory('ltc');
		bids = orderbookSync.book._bids;
		asks = orderbookSync.book._asks;
	}
	else if (currency == 'btc') {
		orderbookSync = new Gdax.OrderbookSync(['BTC-USD']);
		websocket = new Gdax.WebsocketClient(['BTC-USD']);
		trackHistory('btc');
		bids = orderbookSync.book._bids;
		asks = orderbookSync.book._asks;
	}
}

var maxBidColumns = 1;
var maxAskColumns = 1;
var maxTradeHistoryColumns = 1;

function groupBids(){
	var count = 0;
	try {
		//empty the bids
		var bidRow = 0;
		var bidId = '#bids' + bidRow;
		bids.reach(function(eachNode){
			if(count == bidStoppingPoint){
				count = 0;
				bidRow++;
			}

			if(count == 0){
				//empty out the column
				bidId = '#bids' + bidRow;
				$(bidId).html('');
			}

			if(bidRow > maxBidColumns){
				throw true;
			}

			if(eachNode.orders.length > 0){
				var amountSum = 0;
				//then we are going to list it
				for(each in eachNode.orders){
					amountSum += Number(eachNode.orders[each].size.toString());
				}
				// console.log(bidId);
				$(bidId).append('<li class="list-group-item list-group-item-success"><div class="row"><div class="col-xs-6 img-responsive">'
					+ amountSum.toFixed(5) + '</div><div class="col-xs-6 img-responsive">' + Number(eachNode.orders[0].price.toString()) + '</div></div></li>');
				// $(bidId).append('<li class="list-group-item list-group-item-success"><ul class="list-inline">div class="row"><div class="col-xs-6 img-responsive">'
				// 	+ amountSum + '</div><div class="col-xs-6 img-responsive">' + Number(eachNode.orders[0].price.toString()) + '</div></div></li>');
			}
			count++;
		});
	} catch (e) {
		// console.log(2);
		//we are just catching the thing we threw above, but we dont need to do anything with it
	}
}

function groupAsks(){
	var count = 0;
	try {
		//empty the asks
		var askRow = 0;
		var askId = '#asks' + askRow;
		asks.each(function(eachNode){
			if(count == askStoppingPoint){
				count = 0;
				askRow++;
			}

			if(count == 0){
				//empty out the column
				askId = '#asks' + askRow;
				$(askId).html('');
			}

			if(askRow > maxAskColumns){
				throw true;
			}

			if(eachNode.orders.length > 0){
				var amountSum = 0;
				//then we are going to list it
				for(each in eachNode.orders){
					amountSum += Number(eachNode.orders[each].size.toString());
				}
				// console.log(bidId);
				$(askId).append('<li class="list-group-item list-group-item-danger"><div class="row"><div class="col-xs-6 img-responsive">'
					+ amountSum.toFixed(5) + '</div><div class="col-xs-6 img-responsive">' + Number(eachNode.orders[0].price.toString()) + '</div></div></li>');
				// $(bidId).append('<li class="list-group-item list-group-item-success"><ul class="list-inline">div class="row"><div class="col-xs-6 img-responsive">'
				// 	+ amountSum + '</div><div class="col-xs-6 img-responsive">' + Number(eachNode.orders[0].price.toString()) + '</div></div></li>');
			}
			count++;
		});
	} catch (e) {
		// console.log(2);
		//we are just catching the thing we threw above, but we dont need to do anything with it
	}
}

var bidStoppingPoint = 20;
var askStoppingPoint = 20;
var tradeStoppingPoint = 20;

function callGroupBids(){
	groupBids();
	// console.log('bid');
	setTimeout(callGroupBids, 500);
}

function callGroupAsks(){
	groupAsks();
	// console.log('ask');
	setTimeout(callGroupAsks, 500);
}

setTimeout(callGroupAsks, 500);
setTimeout(callGroupBids, 500);


//listener to change the column height


$( document ).ready(function() {
	$('#bids-column-height').on('keyup', function(e){
		bidStoppingPoint = $('#bids-column-height').val();
		if(bidStoppingPoint <= 0){
			bidStoppingPoint = 20;
		}
	})

	$('#asks-column-height').on('keyup', function(e){
		askStoppingPoint = $('#asks-column-height').val();
		if(askStoppingPoint <= 0){
			askStoppingPoint = 20;
		}
	})

	$('#trades-column-height').on('keyup', function(e){
		tradeStoppingPoint = $('#trades-column-height').val();
		if(tradeStoppingPoint <= 0){
			tradeStoppingPoint = 20;
		}
		refreshTradeHistory()
	})

	$('#coinType').on('change', function() {
	    changeCurrency(this.value);
	})

	$('#buyColumnAmount').on('change', function() {
	    changeColumnAmount('bids', 'buyColumns', this.value);
	})

	$('#askColumnAmount').on('change', function() {
	    changeColumnAmount('asks', 'askColumns', this.value);
	})

	$('#tradeHistoryColumnAmount').on('change', function() {
	    changeColumnAmount('trades', 'tradeHistoryColumns', this.value);
	})

});

//type is buy or sell, id is the wrapper div, columnAmount is the number of columns you want to see
function changeColumnAmount(type, id, columnAmount){
	console.log('meh');
	var columnSize = 12 / columnAmount;
	var text = '';
	var columnCounter = 0;

	for(var i = 0; i < columnAmount; i++){
		text += '<div class="col-xs-' + columnSize + '"><ul id="' + type + columnCounter + '" class="list-group"></ul></div>'
		columnCounter++;
	}

	if(type == 'bids'){
		maxBidColumns = columnAmount;
	}
	else if(type == 'asks'){
		maxSellColumns = columnAmount;
	}
	else if(type == 'trades'){
		maxTradeHistoryColumns = columnAmount;
	}

	$('#' + id).html(text);
}
