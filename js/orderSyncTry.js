var Gdax = require('gdax');

var WebsocketClient = Gdax.WebsocketClient;
var PublicClient = Gdax.PublicClient;
var Orderbook = Gdax.Orderbook;
var util = require('util');
var _ = {
  forEach: require('lodash.foreach'),
  assign: require('lodash.assign'),
};

var OrderbookSync = function(productID, apiURI, websocketURI, authenticatedClient) {
  var self = this;

  self.productID = productID || 'BTC-USD';
  self.apiURI = apiURI || 'https://api.gdax.com';
  self.websocketURI = websocketURI || 'wss://ws-feed.gdax.com';
  self.authenticatedClient = authenticatedClient;

  self._queue = [];
  self._sequence = -1;

  WebsocketClient.call(self, self.productID, self.websocketURI);
  self.loadOrderbook();
};

util.inherits(OrderbookSync, WebsocketClient);

_.assign(OrderbookSync.prototype, new function() {
  var prototype = this;

  prototype.onMessage = function(data) {
    var self = this;
    data = JSON.parse(data);
    self.emit('message', data);

    if (self._sequence ===  -1) {
      // Orderbook snapshot not loaded yet
      self._queue.push(data);
    } else {
      self.processMessage(data);
    }
  };

  prototype.loadOrderbook = function() {
    var self = this;
    var bookLevel = 3;
    var args = { 'level': bookLevel };

    self.book = new Orderbook();

    if (self.authenticatedClient) {
      self.authenticatedClient.getProductOrderBook(args, self.productID, cb);
    }
    else {
      if (!self.publicClient) {
        self.publicClient = new PublicClient(self.productID, self.apiURI);
      }

      self.publicClient.getProductOrderBook(args, cb);
    }

    function cb(err, response, body) {
        try {
            if (err) {
              console.log('Failed to load orderbook: ' + err);
              return;
            }

            if (response.statusCode !== 200) {
                console.log('Failed to load orderbook: ' + response.statusCode);
                return;
            }

            var data = JSON.parse(response.body);
            self.book.state(data);

            self._sequence = data.sequence;
            _.forEach(self._queue, self.processMessage.bind(self));
            self._queue = [];
        } catch (e) {
            console.log(e);
        }

    };
  };

  prototype.processMessage = function(data) {
    var self = this;

    if (self._sequence == -1) {
      // Resync is in process
      return;
    }
    if (data.sequence <= self._sequence) {
      // Skip this one, since it was already processed
      return;
    }

    if (data.sequence != self._sequence + 1) {
      // Dropped a message, start a resync process
      self._queue = [];
      self._sequence = -1;

      self.loadOrderbook();
      return;
    }

    self._sequence = data.sequence;
    switch (data.type) {
      case 'open':
        self.book.add(data);
        break;

      case 'done':
        self.book.remove(data.order_id);
        break;

      case 'match':
        self.book.match(data);
        break;

      case 'change':
        self.book.change(data);
        break;
    }
  };

});


//listeners
var ethOrderbookSync = new OrderbookSync(['ETH-USD']);
var ltcOrderbookSync = new OrderbookSync(['LTC-USD']);
var btcOrderbookSync = new OrderbookSync(['BTC-USD']);
var orderbookSync = ethOrderbookSync;
// var websocket = new Gdax.WebsocketClient(['ETH-USD']);

var trade_history_amount = 0;

var tradeHistory = [];

function handleTickers(data){
    trackAnalytics(data);
    // console.log('hrer');
	var size;
	var amount;
	if(data.type == 'match'){
        if(data.product_id == coin_currency){
            populateTradeHistory(data);
        }
	}
}

function populateTradeHistory(data){
	if(tradeHistory.length > 100){
		//pop the top
		tradeHistory.shift();
	}
	tradeHistory.push(data);
	refreshTradeHistory();
}

function refreshTradeHistory(){
	$('#tradeHistory0').html('');
	var start = 0;
	for(var i = tradeHistory.length - 1; i > -1; i--){
		if(start > maxTradeRowsPerColumn){
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

var bids = orderbookSync.book._bids;
var asks = orderbookSync.book._asks;
orderbookSync.addListener('message', handleTickers);
var coin_currency = 'ETH-USD';

function changeCurrency(currency){
    orderbookSync.removeAllListeners();

	if(currency == 'eth'){
        coin_currency = 'ETH-USD';
		orderbookSync = ethOrderbookSync;
	}
	else if (currency == 'ltc') {
        coin_currency = 'LTC-USD';
		orderbookSync = ltcOrderbookSync;
	}
	else if (currency == 'btc') {
        coin_currency = 'BTC-USD';
		orderbookSync = btcOrderbookSync;
	}

    bids = orderbookSync.book._bids;
    asks = orderbookSync.book._asks;

    tradeHistory = [];
	orderbookSync.addListener('message', handleTickers);
    // orderbookSync.addListener('message', trackAnalytics);
}

var maxBidColumns = 1;
var maxAskColumns = 1;
var maxTradeHistoryColumns = 1;

function populateBids(){
	var bidColumn = 0;
    var bidRow = 0;
    var bidId = '#bids0';
	try {
		//empty the bids

		bids.reach(function(eachNode){
			// if(count == maxBidRowsPerColumn){
			// 	count = 0;
			// 	bidRow++;
			// }
			if(bidRow == 0){
				//empty out the column
				$('#bids0').html('');
			}
			if(bidRow > maxBidRowsPerColumn){
				throw true;
			}

			if(eachNode.orders.length > 0){
				var amountSum = 0;
				//then we are going to list it
				for(each in eachNode.orders){
					amountSum += Number(eachNode.orders[each].size.toString());
				}
				// console.log(bidId);
				$('#bids0').append('<li class="list-group-item list-group-item-success"><div class="row"><div class="col-xs-6 img-responsive">'
					+ amountSum.toFixed(5) + '</div><div class="col-xs-6 img-responsive">' + Number(eachNode.orders[0].price.toString()) + '</div></div></li>');
			}
			bidRow++;
		});
	} catch (e) {
		// console.log(2);
		//we are just catching the thing we threw above, but we dont need to do anything with it
	}
}

function populateAsks(){
	var askColumn = 0;
    var askRow = 0;
    var askId = '#asks0';
	try {
		//empty the asks

		asks.each(function(eachNode){
			// if(count == maxAskRowsPerColumn){
			// 	count = 0;
			// 	askRow++;
			// }
			if(askRow == 0){
				//empty out the column
				$('#asks0').html('');
			}
			if(askRow > maxAskRowsPerColumn){
				throw true;
			}
			if(eachNode.orders.length > 0){
				var amountSum = 0;
				//then we are going to list it
				for(each in eachNode.orders){
					amountSum += Number(eachNode.orders[each].size.toString());
				}
				$('#asks0').append('<li class="list-group-item list-group-item-danger"><div class="row"><div class="col-xs-6 img-responsive">'
					+ amountSum.toFixed(5) + '</div><div class="col-xs-6 img-responsive">' + Number(eachNode.orders[0].price.toString()) + '</div></div></li>');
			}

			askRow++;
		});
	} catch (e) {
		//we are just catching the thing we threw above, but we dont need to do anything with it
	}
}

var maxBidRowsPerColumn = 20;
var maxAskRowsPerColumn = 20;
var maxTradeRowsPerColumn = 20;

function callPopulateBids(){
	populateBids();
	setTimeout(callPopulateBids, 500);
}

function callPopulateAsks(){
	populateAsks();
	setTimeout(callPopulateAsks, 500);
}

setTimeout(callPopulateAsks, 500);
setTimeout(callPopulateBids, 500);


//listener to change the column height


$( document ).ready(function() {
	$('#bids-column-height').on('keyup', function(e){
		maxBidRowsPerColumn = $('#bids-column-height').val();
		if(maxBidRowsPerColumn <= 0){
			maxBidRowsPerColumn = 20;
		}
	})

	$('#asks-column-height').on('keyup', function(e){
		maxAskRowsPerColumn = $('#asks-column-height').val();
		if(maxAskRowsPerColumn <= 0){
			maxAskRowsPerColumn = 20;
		}
	})

	$('#trades-column-height').on('keyup', function(e){
		maxTradeRowsPerColumn = $('#trades-column-height').val();
		if(maxTradeRowsPerColumn <= 0){
			maxTradeRowsPerColumn = 20;
		}
		refreshTradeHistory()
	})

	$('#coinType').on('change', function() {
	    changeCurrency(this.value);
	})

});
