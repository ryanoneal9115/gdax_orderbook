var Gdax = require('gdax');

var WebsocketClient = Gdax.WebsocketClient;
var PublicClient = Gdax.PublicClient;
var Orderbook = Gdax.Orderbook;
var util = require('util');
var d3 = require("d3");
var techan = require("techan");
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

  (function() {
      self.loadHistoricalData();
      //setInterval(self.loadHistoricalData, 20000);
   })();
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
  prototype.populateHistoricalData = function(err, response, body){
    if (err) {
        throw 'Failed to load history: ' + err;
      }

      if (response.statusCode !== 200) {
          throw 'Failed to load orderbook: ' + response.statusCode;
      }
      var data = JSON.parse(response.body);



        var margin = {top: 20, right: 20, bottom: 30, left: 50},
                width = 960 - margin.left - margin.right,
                height = 500 - margin.top - margin.bottom;

        var convertTimeToDate = function(d) {
          var time = new Date(d * 1000);
          return time;
        };

        var parseDate = d3.timeParse("%d-%b-%y");

        var x = techan.scale.financetime()
            .range([0, width]);

    var y = d3.scaleLinear()
            .range([height, 0]);

    var candlestick = techan.plot.candlestick()
            .xScale(x)
            .yScale(y);

    var ichimoku = techan.plot.ichimoku()
            .xScale(x)
            .yScale(y);

    var xAxis = d3.axisBottom(x);

    var yAxis = d3.axisLeft(y)
            .tickFormat(d3.format(",.3s"));

    var svg = d3.select("body").append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
        .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    svg.append("clipPath")
            .attr("id", "clip")
        .append("rect")
            .attr("x", 0)
            .attr("y", y(1))
            .attr("width", width)
            .attr("height", y(0) - y(1));

    var ichimokuIndicator = techan.indicator.ichimoku();
    // Don't show where indicators don't have data
    var indicatorPreRoll = ichimokuIndicator.kijunSen()+ichimokuIndicator.senkouSpanB();

    var accessor = candlestick.accessor();
    data = data.map(function(d) {
          var time = convertTimeToDate(d[0]);
          return {
              date: time,
              open: +d[3],
              high: +d[2],
              low: +d[1],
              close: +d[4],
              volume: +d[5]
          };
      }).sort(function(a, b) { return d3.ascending(accessor.d(a), accessor.d(b)); });

      svg.append("g")
                .attr("class", "ichimoku")
                .attr("clip-path", "url(#clip)");

        svg.append("g")
                .attr("class", "candlestick")
                .attr("clip-path", "url(#clip)");

        svg.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0," + height + ")");

        svg.append("g")
                .attr("class", "y axis")
            .append("text")
                .attr("transform", "rotate(-90)")
                .attr("y", 6)
                .attr("dy", ".71em")
                .style("text-anchor", "end")
                .text("Ichimoku");

        // Data to display initially
        draw(data.slice(0, data.length-20));
        // Only want this button to be active if the data has loaded
        d3.select("button").on("click", function() { draw(data); }).style("display", "inline");

    function draw(data) {
        var ichimokuData = ichimokuIndicator(data);
        x.domain(data.map(ichimokuIndicator.accessor().d));
        // Calculate the y domain for visible data points (ensure to include Kijun Sen additional data offset)
        y.domain(techan.scale.plot.ichimoku(ichimokuData.slice(indicatorPreRoll-ichimokuIndicator.kijunSen())).domain());

        // Logic to ensure that at least +KijunSen displacement is applied to display cloud plotted ahead of ohlc
        x.zoomable().clamp(false).domain([indicatorPreRoll, data.length+ichimokuIndicator.kijunSen()]);

        svg.selectAll("g.candlestick").datum(data).call(candlestick);
        svg.selectAll("g.ichimoku").datum(ichimokuData).call(ichimoku);
        svg.selectAll("g.x.axis").call(xAxis);
        svg.selectAll("g.y.axis").call(yAxis);
    }
        // var x = techan.scale.financetime()
        //         .range([0, width]);
        //
        // var y = d3.scaleLinear()
        //         .range([height, 0]);
        //
        // var candlestick = techan.plot.candlestick()
        //         .xScale(x)
        //         .yScale(y);
        //
        // var xAxis = d3.axisBottom()
        //         .scale(x);
        //
        // var yAxis = d3.axisLeft()
        //         .scale(y);
        //
        // var svg = d3.select("#chart").append("svg")
        //         .attr("width", width + margin.left + margin.right)
        //         .attr("height", height + margin.top + margin.bottom)
        //         .append("g")
        //         .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
        //
        //   var accessor = candlestick.accessor();
        //
        //   data = data.map(function(d) {
        //       var time = convertTimeToDate(d[0]);
        //       return {
        //           date: time,
        //           open: +d[3],
        //           high: +d[2],
        //           low: +d[1],
        //           close: +d[4],
        //           volume: +d[5]
        //       };
        //   }).sort(function(a, b) { return d3.ascending(accessor.d(a), accessor.d(b)); });
        //
        //   svg.append("g")
        //           .attr("class", "candlestick");
        //
        //   svg.append("g")
        //           .attr("class", "x axis")
        //           .attr("transform", "translate(0," + height + ")");
        //
        //   svg.append("g")
        //           .attr("class", "y axis")
        //           .append("text")
        //           .attr("transform", "rotate(-90)")
        //           .attr("y", 6)
        //           .attr("dy", ".71em")
        //           .style("text-anchor", "end")
        //           .text("Price ($)");
        //
        //   // Data to display initially
        //   draw(data.slice(0, data.length-20));
        //   // Only want this button to be active if the data has loaded
        //   d3.select("button").on("click", function() { draw(data); }).style("display", "inline");
        //
        // function draw(data) {
        //     x.domain(data.map(candlestick.accessor().d));
        //     y.domain(techan.scale.plot.ohlc(data, candlestick.accessor()).domain());
        //
        //     svg.selectAll("g.candlestick").datum(data).call(candlestick);
        //     svg.selectAll("g.x.axis").call(xAxis);
        //     svg.selectAll("g.y.axis").call(yAxis);
        // }
  }
  prototype.loadHistoricalData = function() {
      var self = this;
      self.publicClient.getProductHistoricRates(self.populateHistoricalData);
  }

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

function updateCharts() {
  alert();
  //OrderbookSync.prototype.loadHistoricalData();
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
