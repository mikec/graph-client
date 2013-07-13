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

		window.GraphClientResource = function GraphClientResource() { }

		GraphClientResource.create = function(data, success, error) {
			var res = graphClientResourceFactory(entityName, endpointName);
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

			var res = graphClientResourceFactory(entityName, endpointName);

			var url = GC.rootUrl + '/' + endpointName + '/' + id;

			//add included connections to the url, if option is set
			var connPropResources = [];
			if(options && options.includeConnections) {
				var includeQs = '';
				for(var i in connectionProperties[entityName]) {
					var connProp = connectionProperties[entityName][i].property;
					var connEntity = connectionProperties[entityName][i].connectedEntity;
					var connEndpointName = entities[connEntity].endpoint;
					connPropResources.push({
						propertyName: connProp,
						resource: graphClientResourceFactory(connEntity, connEndpointName)
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
				//convert connected properties to relationship items:
				// {
				//	  resource: {} //instance of GraphClientResource
				//	  relationship: {} //data for this relationship
				// }
				for(var i in connPropResources) {
					var propResObj = connPropResources[i];
					if(res[propResObj.propertyName] && res[propResObj.propertyName].data && res[propResObj.propertyName].data.length > 0) {
						for(var j in res[propResObj.propertyName].data) {
							var propRes = res[propResObj.propertyName].data[j];
							if(!(propRes.resource instanceof GraphClientResource)) {
								var relData = {};
								if(propRes.relationship) relData = propRes.relationship;
								res[propResObj.propertyName].data[j] = {
									resource: $.extend(propRes, propResObj.resource),
									relationship: relData
								}
								res[propResObj.propertyName].data[j].resource.__setState();
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
				  url: GC.rootUrl + '/' + this.endpoint + '/' + this.id,
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
				  url: GC.rootUrl + '/' + $this.endpoint + '/' + $this.id
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
			  url: GC.rootUrl + '/' + this.endpoint + '/' + this.id
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

	function graphClientResourceFactory(entityName, endpointName) {
		var res = new GraphClientResource();
		res.resourceType = entityName;
		res.endpoint = endpointName;
		for(var i in connectionProperties[entityName]) {
			var connProp = connectionProperties[entityName][i];
			res[connProp.property] = {};
			res[connProp.property].data = [];
			res[connProp.property].$connect = function() {
				var relationshipData, success, error;
				var connRes = arguments[0];
				if(typeof(arguments[1]) == 'function') {
					success = arguments[1]; error = arguments[2];
				} else {
					relationshipData = arguments[1]; success = arguments[2]; error = arguments[3];
				}
				if(!relationshipData) relationshipData = {};

				var d;
				if(connRes.id > 0) {
					d = { id: connRes.id };
				}

				//check if connection already exists
				var connectionExists = false;
				for(var i in res[connProp.property].data) {
					var r = res[connProp.property].data[i].resource;
					if(r.id == connRes.id) {
						//add relationship data to existing connection
						$.extend(res[connProp.property].data[i].relationship, relationshipData);
						connectionExists = true;
						break;
					}
				}

				if(connectionExists) { //add relationship data to inverse connection 
					for(var i in connRes[connProp.connectedEntityProperty].data) {
						var r = connRes[connProp.connectedEntityProperty].data[i].resource;
						if(r.id == res.id) {
							$.extend(connRes[connProp.connectedEntityProperty].data[i].relationship, relationshipData);
							break;
						}
					}
				}

				if(!connectionExists) {
					//add connections to start and end entities
					res[connProp.property].data.push({
						resource: connRes,
						relationship: relationshipData
					});
					connRes[connProp.connectedEntityProperty].data.push({
						resource: res,
						relationship: relationshipData
					});
				}

				$.ajax({
				  type: "POST",
				  url: GC.rootUrl + '/' + entities[entityName].endpoint + '/' + res.id + '/' + connProp.property,
				  data: $.extend(d, {relationship: relationshipData })
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

