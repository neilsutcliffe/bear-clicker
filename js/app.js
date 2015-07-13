var app = angular.module('bearClicker', []);


// Main Game Method
app.controller('GameCtrl', ['$scope', 'investments', function ($scope, investments) {
	$scope.investments = investments;
}]);

app.factory('investments', [ function() {
	var self = {};

	self.availableInvestments = [];

	var level = 1;

	var investmentSource = [
		{'name': 'Brewery',
			'snippet': 'Bears like beer!'},
		{'name': 'Market',
			'snippet': 'Bears can exchange honey for goods and services'},
		{'name': 'Hypermarket',
			'snippet': 'Like a market, but more so'},
		{'name': 'Honey Farm',
			'snippet': "Honey grows on trees"},
		{'name': 'Honey Bank',
			'snippet': 'No sell by date, no downside to saving'},
		{'name': 'Bear Band',
			'snippet': 'I want it that way'},
		{'name': 'Internet Factory',
			'snippet': 'A series of tubes'},
		{'name': 'Honey Exchange',
			'snippet': 'The bear of Wall St.'},
		{'name': 'Bear Conglomorate',
			'snippet': 'Bearmart'},
		{'name': 'Offworld Colony',
			'snippet': 'Where no bear has gone before.'}
	];

	var setupInvestment = function (investment, level)
	{
		investment.quantity = 0;
		investment.level = level;
		investment.cost = Math.pow(5,level) * 2;
		investment.income = Math.pow(5,level) / 5;
		investment.calculated = 0;

		self.availableInvestments.push(investment);
	}

	var setupNextInvestment = function()
	{
		var count = self.availableInvestments.length;

		if (count < investmentSource.length)
		{
			setupInvestment(investmentSource[count], count + 1);
		}
	}

	setupNextInvestment();

	self.checkAffordable = function(ammount)
	{
		var count = self.availableInvestments.length;

		for (var i = count - 1; i >= 0; i--) {
			var inv = self.availableInvestments[i];
			inv.affordable = inv.cost <= ammount;
		};

		if (self.availableInvestments[count - 1].quantity > 0)
		{
			setupNextInvestment();
		}
	}

	return self;
}]);

// Handles click events on the bear including calculations.
app.controller('BearCtrl', [ '$scope', '$interval', 'wallet', function ($scope, $interval, wallet) {
	// Click Value. This will be modified whenever anything is bought, to make clicking always worthwhile.
	var clickValue = 1;
	$scope.bearLevel = 1;
	$scope.nextLevelCost = 10;
	$scope.upgradable = false;
	

	// Main Game Timer.
	var timer = $interval(function () {
		calculateInvestments();
	}, 1000, 0 );

	$scope.bearClick = function ()
	{
		wallet.addFunds(clickValue);
	};

	var calculateInvestments = function ()
	{
		wallet.calculateInvestments();
	}

	$scope.showMeTheHoney = function ()
	{
		return wallet.honey;
	}

	$scope.levelUp = function ()
	{
		var cost = $scope.nextLevelCost;

		if (wallet.tryBuy(cost))
		{
			$scope.nextLevelCost = cost * 3;
			$scope.bearLevel++;
			clickValue = clickValue * 2;
		}
	}

	$scope.$watch('showMeTheHoney()', function(newVal) { // I went there
		$scope.honey = newVal;
		$scope.upgradable = $scope.nextLevelCost <= newVal;
	});

}]);

// Handles display format for honey, and animates counter.
app.directive('bearHoneyCounter', function ()
{
	return {
		restrict: 'E',
		templateUrl: 'honeyCounter.html',
		scope: { honey: '=' },
		controller: function ($scope, $interval)
		{
			var actualHoney = 0;
			var honey = $scope.honey;
			$scope.displayHoney = 0;
			var counterIncrements = [];

			$scope.$watch('honey', function(newVal) 
			{
				newVal = newVal || 0
				if (newVal != actualHoney)
				{
					smoothOutHoney(newVal);
				}
			});

			var maxSplit = 8;

			// Setup Counter
			for (var i = 0; i < maxSplit; i++)
			{
				counterIncrements[i] = 0;
			}

			$interval(function (){
				processQueue();
			}, 1000 / maxSplit)

			var smoothHoney = function (honey, splitBy)
			{
				var remainder = honey % splitBy;
				var increment = (honey - remainder)/ splitBy;

				for (var i = 0; i < maxSplit; i += (maxSplit / splitBy)) {
					counterIncrements[i] += increment;
				};

				counterIncrements[0] += remainder;
			}

			var processQueue = function ()
			{
				$scope.displayHoney += counterIncrements[0];
				counterIncrements.shift();
				counterIncrements[maxSplit - 1] = 0;
			}

			// For display purposes only. Never base buying on this! Wallet is more accurate/faster for logic!
			var smoothOutHoney = function (newHoney) // Should work with negative (spending)
			{
				var difference = newHoney - actualHoney; // Base this off actual honey in case we trigger multiple updates.
				actualHoney = newHoney;

				if (difference == 1)
				{
					smoothHoney(difference, 1);
				}
				else if ( difference <= (maxSplit / 4))
				{
					smoothHoney(difference, 2);
				}
				else if ( difference <= (maxSplit / 2))
				{
					smoothHoney(difference, 4);
				}
				else
				{
					smoothHoney(difference, 8);
				}
			}
		}
	};
});


app.directive('bearInvestment', ['wallet', function (wallet)
{
	return {
		restrict: 'E',
		templateUrl: 'investment.html',
		scope: { source: '=' },
		controller: function ($scope)
		{
			var source = $scope.source

			$scope.buy = function ()
			{
				if (wallet.tryBuy(source.cost))
				{
					source.quantity++;
					source.cost = Math.round(source.cost * 1.15);
					source.calculated = source.income * source.quantity;
				}
				else
				{
					source.affordable = false; // Should never be triggered
				}
			}
		}
	};
}]);

// Manages currency, transcations and processing.
app.factory('wallet', [ 'investments', function(investments) {
	var self = {};

	self.level = 1;

	self.honey = 0;


	self.tryBuy = function(ammount)
	{
		var affordable = self.honey >= ammount;
		if (affordable)
		{
			self.addFunds(-ammount);
			investments.checkAffordable(self.honey);
		}

		return affordable;
	}

	self.addFunds = function(ammount)
	{
		self.honey += ammount;
		investments.checkAffordable(self.honey);
	}

	self.calculateInvestments = function ()
	{
		var totalToAdd = 0;

		for (var i = investments.availableInvestments.length - 1; i >= 0; i--) {
			var inv = investments.availableInvestments[i];
			totalToAdd += inv.calculated;
		};
		self.addFunds(totalToAdd);
	}

	return self;
}]);