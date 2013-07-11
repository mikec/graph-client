(function(window) {

	window.GC = function GC() { }

	var connectionProperties = {};

	GC.setup = function(params) {
		if(params) {
			this.rootUrl = (params.rootUrl.substr(params.rootUrl.length - 1, 1) == '/' ? params.rootUrl.substr(0, params.rootUrl.length - 1) : params.rootUrl);
		}
	}

	GC.define = function() {

		if(arguments[0].indexOf('.') == -1) { // define entity
			defineEntity(arguments[0], arguments[1]);
		} else { // define connection
			if(!arguments[1]) arguments[1] = arguments[0];
			var startConn = {
				entity: arguments[0].split('.')[0],
				property: arguments[0].split('.')[1]
			};
			var endConn = {
				entity: arguments[1].split('.')[0],
				property: arguments[1].split('.')[1]
			}
			defineConnection(startConn, endConn);
		}
	}

	function defineEntity(entityName, pluralEntityName) {

		var endpointName = (pluralEntityName ? pluralEntityName : entityName+'s');

		window.GraphClientResource = function GraphClientResource() {}

		GraphClientResource.create = function(data, success, error) {
			var res = graphClientResourceFactory(entityName);
			$.extend(res, data);

			$.ajax({
			  type: "POST",
			  url: GC.rootUrl + '/' + endpointName,
			  data: data
			}).done(function(data) {
				res.id = data.key;
				res.__setState();
				if(success) success(data);
			}).error(function(err) {
				if(error) error(err);
			});

			return res;
		}
		GraphClientResource.get = function(id, success, error) {
			var res = graphClientResourceFactory(entityName);

			$.ajax({
			  type: "GET",
			  url: GC.rootUrl + '/' + endpointName + '/' + id,
			}).done(function(data) {
				$.extend(res, data);
				res.__setState();
				if(success) success(data);
			}).error(function(err) {
				if(error) error(err);
			});

			return res;
		}
		GraphClientResource.prototype.$save = function(success, error) {

			var data = {};
			//diff properties to find what has changed
			var numDiffs = 0;
			for(var i in this) {
				if(i != '__state' && this[i] != this.__state.properties[i]) {
					numDiffs++;
					data[i] = this[i];
				}
			}
			
			//save the changed properties
			var $this = this;
			if(numDiffs > 0) {
				$.ajax({
				  type: "POST",
				  url: GC.rootUrl + '/' + endpointName + '/' + this.id,
				  data: data
				}).done(function(d) {
					$this.__setState();
					if(success) success(d);
				}).error(function(err) {
					if(error) error(err);
				});
			} else {
				if(success) success();
			}
		}
		GraphClientResource.prototype.$sync = function(success, error) {
			var $this = this;
			$this.$save(function() {
				$.ajax({
				  type: "GET",
				  url: GC.rootUrl + '/' + endpointName + '/' + $this.id
				}).done(function(d) {
					$.extend($this, d);
					if(success) success(d);
				}).error(function(err) {
					if(error) error(err);
				});
			});
		}
		GraphClientResource.prototype.$delete = function(success, error) {
			var $this = this;
			$.ajax({
			  type: "DELETE",
			  url: GC.rootUrl + '/' + endpointName + '/' + this.id
			}).done(function(d) {
				//remove all properties from the resource object
				for(var i in $this) {
					delete $this[i];
				}
				if(success) success(d);
			}).error(function(err) {
				if(error) error(err);
			});
		}
		GraphClientResource.prototype.__setState = function() {
			if(!this.__state) this.__state = {};
			this.__state.properties = $.extend({}, this);
		}

		var cls = capitalize(entityName);
		window[cls] = function() {};
		$.extend(window[cls], GraphClientResource);
	}

	function graphClientResourceFactory(entityName) {
		var res = new GraphClientResource();
		for(var i in connectionProperties[entityName]) {
			var prop = connectionProperties[entityName][i];
			res[prop] = [];
			res[prop].$connect = function() {

			}
		}
		return res;
	}

	function defineConnection(startConn, endConn) {
		if(!connectionProperties[startConn.entity]) connectionProperties[startConn.entity] = [];
		if(!contains(connectionProperties[startConn.entity], startConn.property)) connectionProperties[startConn.entity].push(startConn.property);		
		if(!connectionProperties[endConn.entity]) connectionProperties[endConn.entity] = [];
		if(!contains(connectionProperties[endConn.entity], endConn.property)) connectionProperties[endConn.entity].push(endConn.property);
	}

	function capitalize(string)
	{
	    return string.charAt(0).toUpperCase() + string.slice(1);
	}

	function contains(array, item) {
		for(var i in array) {
			if(array[i] == item) return true;
		}
		return false;
	}

})(window);

