(function(window) {

	window.GC = function GC() { }

	var entities = GC.entities = {};
	var connectionProperties = GC.connectionProperties = {};

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
		entities[entityName] = {
			endpoint: endpointName
		}

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
		GraphClientResource.getAll = function() {
			var id = arguments[0];
			var options, success, error;
			if(typeof(arguments[1]) == 'function') {
				success = arguments[1]; error = arguments[2];
			} else {
				options = arguments[1]; success = arguments[2]; error = arguments[3];
			}
			if(!options) options = {};
			$.extend(options, {includeConnections:true})
			return this.get(id, options, success, error);
		}
		GraphClientResource.get = function() {
			var id = arguments[0];
			var options, success, error;
			if(typeof(arguments[1]) == 'function') {
				success = arguments[1]; error = arguments[2];
			} else {
				options = arguments[1]; success = arguments[2]; error = arguments[3];
			}

			var res = graphClientResourceFactory(entityName);

			var url = GC.rootUrl + '/' + endpointName + '/' + id;

			//add included connections to the url, if option is set
			var connPropResources = [];
			if(options && options.includeConnections) {
				var includeQs = '';
				for(var propEntityName in connectionProperties[entityName]) {
					var connProp = connectionProperties[entityName][propEntityName].property;
					connPropResources.push({
						propertyName: connProp,
						resource: graphClientResourceFactory(propEntityName)
					});
					includeQs += connProp + ',';
				}
				if(includeQs.length > 0) {
					includeQs = '?include=' + includeQs;
					includeQs = includeQs.substr(0, includeQs.length - 1);
					url += includeQs;
				}
			}

			$.ajax({
			  type: "GET",
			  url: url
			}).done(function(data) {
				$.extend(res, data);
				res.__setState();
				//convert connected properties to resources
				for(var i in connPropResources) {
					var propResObj = connPropResources[i];
					if(res[propResObj.propertyName] && res[propResObj.propertyName].data && res[propResObj.propertyName].data.length > 0) {
						for(var j in res[propResObj.propertyName].data) {
							var propRes = res[propResObj.propertyName].data[j];
							if(!(propRes instanceof GraphClientResource)) {
								$.extend(propRes, propResObj.resource);
							}
						}
					}
				}
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
			var connProp = connectionProperties[entityName][i];
			res[connProp.property] = {};
			res[connProp.property].data = [];
			res[connProp.property].$connect = function(connRes, success, error) {
				var d;
				if(connRes.id > 0) {
					d = { id: connRes.id };
				}

				//add connections to start and end entities
				res[connProp.property].data.push(connRes);
				connRes[connProp.connectedEntityProperty].data.push(res);

				$.ajax({
				  type: "POST",
				  url: GC.rootUrl + '/' + entities[entityName].endpoint + '/' + res.id + '/' + connProp.property,
				  data: d
				}).done(function(d) {
					if(success) success(d);
				}).error(function(err) {
					if(error) error(err);
				});
			}
		}
		return res;
	}

	function defineConnection(startConn, endConn) {
		if(!connectionProperties[startConn.entity]) connectionProperties[startConn.entity] = [];	
		if(!connectionProperties[endConn.entity]) connectionProperties[endConn.entity] = [];

		var connPropExists = false;
		for(var i in connectionProperties[startConn.entity]) {
			var propObj = connectionProperties[startConn.entity][i];
			if(propObj.property == startConn.property) {
				connPropExists = true;
				break;
			}
		}
		if(!connPropExists) {
			connectionProperties[startConn.entity].push({
				property: startConn.property,
				connectedEntity: endConn.entity,
				connectedEntityProperty: endConn.property
			});	
		}

		connPropExists = false;
		for(var i in connectionProperties[endConn.entity]) {
			var propObj = connectionProperties[endConn.entity][i];
			if(propObj.property == endConn.property) {
				connPropExists = true;
				break;
			}
		}
		if(!connPropExists) {
			connectionProperties[endConn.entity].push({
				property: endConn.property,
				connectedEntity: startConn.entity,
				connectedEntityProperty: startConn.property
			});	
		}
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

	function isSimpleProp(prop) {
		return (typeof(prop) != 'object' && typeof(prop) != 'function');
	}

})(window);

