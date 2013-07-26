(function(window) {

	window.GC = function GC() { }

	var entities = GC.entities = {};
	var connectionProperties = GC.connectionProperties = {};

	GC.setup = function(params) {
		if(params) {
			$.extend(this, params);

			//defaults
			if(!this.pageSize) this.pageSize = 10;
			if(this.rootUrl) this.rootUrl = this.rootUrl.substr(this.rootUrl.length - 1, 1) == '/' ? this.rootUrl.substr(0, params.rootUrl.length - 1) : this.rootUrl;
			if(!this.defaultParams) this.defaultParams = {};
			if(!this.service) {
				this.service = function(method, url, data, success, error) {
					$.ajax({
						type: method,
						url: url,
						data: data
					}).done(success).error(error);
				}
			}

			if(params.useServerConfig) {
				GC.service('GET', GC.rootUrl + '/config', null, function(d) {
					for(var i in d.entities) {
						GC.define(d.entities[i].name, d.entities[i].indexName);
					}
					for(var i in d.connections) {
						GC.define(d.connections[i].outboundPath, d.connections[i].inboundPath)
					}
					for(var i in d.customProperties) {
						defineCustomProperty(d.customProperties[i].property, d.customProperties[i].baseEntity.name);
					}
					if(params.ready) params.ready();
				},function(err) {
					//
				});
			} else {
				if(params.ready) params.ready();
			}
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

	function defineCustomProperty(propertyName, baseEntityName) {
		var baseEntity = entities[baseEntityName];
		if(!baseEntity.customProperties) baseEntity.customProperties = [];
		baseEntity.customProperties.push(propertyName);
	}

	function defineEntity(entityName, pluralEntityName) {

		var endpointName = (pluralEntityName ? pluralEntityName : entityName+'s');
		entities[entityName] = {
			endpoint: endpointName
		}

		window.GraphClientResource = function GraphClientResource(data) { 
			if(data) {
				$.extend(this, data);
			}
		}

		GraphClientResource.create = function() {
			var data, id, success, error;
			if(parseInt(arguments[0]) > 0) {
				id = parseInt(arguments[0]);
				data = arguments[1];
				success = arguments[2];
				error = arguments[3];
			} else {
				data = arguments[0];
				success = arguments[1];
				error = arguments[2];
			}

			if(id > 0) {
				data.id = id;
			}

			var res = graphClientResourceFactory(entityName, endpointName);
			$.extend(res, data);

			GC.service('POST', constructUrl(endpointName), data, function(data) {
				res.id = data.key;
				res.__setState();
				if(success) success(data);
			},function(err) {
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

			//add included connections to the url, if option is set
			var urlParams = {};
			var connProps = [];
			if(options && options.includeConnections) {
				for(var i in connectionProperties[entityName]) {
					var connProp = connectionProperties[entityName][i].property;
					var connEntity = connectionProperties[entityName][i].connectedEntity;
					var connEndpointName = entities[connEntity].endpoint;
					connProps.push({
						property: connProp,
						entity: connEntity,
						endpoint: connEndpointName
					});
					if(!urlParams.include) urlParams.include = '';
					urlParams.include += connProp + ',';
				}
				for(var i in entities[entityName].customProperties) {
					var custProp = entities[entityName].customProperties[i];
					if(!urlParams.include) urlParams.include = '';
					urlParams.include += custProp + ',';
				}
				if(urlParams.include && urlParams.include.length > 0) {
					urlParams.include = urlParams.include.substr(0, urlParams.include.length-1);
				}
			}
			urlParams.limit = GC.pageSize;

			GC.service('GET', constructUrl(endpointName + '/' + id, urlParams), null, function(data) {
				//extend the existing resource with data from the service call response
				//simple properties first
				for(var prop in data) {
					if(isSimpleProp(data[prop]) && data[prop].toString().indexOf('__') != 0) {
						res[prop] = data[prop];
					}
				}
				//then connection properties
				for(var i in connProps) {
					var connProp = connProps[i];
					if(res[connProp.property] && 
						res[connProp.property].data && 
						data[connProp.property] && 
						data[connProp.property].data) {
						//set count property
						res[connProp.property].count = data[connProp.property].count;
						//set each item in data property
						for(var j in data[connProp.property].data) {
							res[connProp.property].data.push(data[connProp.property].data[j]);
						}
					}
				}

				// and custom properties
				for(var i in entities[entityName].customProperties) {
					var custProp = entities[entityName].customProperties[i];
					if(data[custProp]) {
						if(isSimpleProp(data[custProp])) {
							res[custProp] = data[custProp];
						} else {
							for(var j in data[custProp].data) {
								data[custProp].data[j] = {
									resource: graphClientResourceFactory(data[custProp].data[j])
								}
							}
							res[custProp] = $.extend({}, data[custProp]);
						}
					}
				}

				res.__setState();

				//convert all connected properties to relationship items:
				for(var i in connProps) {
					var connProp = connProps[i];
					if(res[connProp.property] && res[connProp.property].data && res[connProp.property].data.length > 0) {
						for(var j in res[connProp.property].data) {
							res[connProp.property].data[j] = new GraphClientRelatedItem(res[connProp.property].data[j], connProp.entity, connProp.endpoint);
						}
					}
				}
				if(success) success(data);
			}, function(err) {
				if(error) error(err);
			});

			return res;
		}
		GraphClientResource.prototype.$save = function(success, error) {

			var data = {};
			//diff properties to find what has changed
			var numDiffs = 0;
			for(var i in this) {
				if(i != '__state' 
					&& this[i] != this.__state.properties[i]
					&& isSimpleProp(this[i])) {
					numDiffs++;
					data[i] = this[i];
				}
			}
			
			//save the changed properties
			var $this = this;
			if(numDiffs > 0) {
				GC.service('POST', 
					constructUrl(this.__endpoint + '/' + this.id), 
					data,
					function(d) {
						$this.__setState();
						if(success) success(d);
					}, function(err) {
						if(error) error(err);
					}
				);
			} else {
				if(success) success();
			}
		}
		GraphClientResource.prototype.$sync = function(success, error) {
			var $this = this;
			var url = constructUrl(this.__endpoint + '/' + this.id);
			this.$save(function() {
				GC.service('GET', url, null, function(d) {
					$.extend($this, d);
					if(success) success(d);
				}, function(err) {
					if(error) error(err);
				});
			});
		}
		GraphClientResource.prototype.$delete = function(success, error) {
			var $this = this;
			GC.service('DELETE', constructUrl(this.__endpoint + '/' + this.id), null, function(d) {
				//remove all properties from the resource object
				for(var i in $this) {
					delete $this[i];
				}
				if(success) success(d);
			}, function(err) {
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



	function graphClientResourceFactory() {

		var data, entityName, endpointName;
		if(typeof(arguments[0]) == 'object') {
			data = arguments[0];
			entityName = (data.__resourceType ? data.__resourceType : arguments[1]);
			endpointName = (entities[entityName] && entities[entityName].endpoint ? entities[entityName].endpoint : arguments[2]);
		} else {
			data = null;
			entityName = arguments[0];
			endpointName = arguments[1];
		}

		function GraphClientConnectionProperty(connectionProperty) { 
			this.connection = connectionProperty;
			this.data = [];
		}

		GraphClientConnectionProperty.prototype.$connect = function() {
			var connRes, data, relationshipData, success, error;
			if(arguments[0] instanceof GraphClientResource) {
				connRes = arguments[0];
			} else {
				data = arguments[0];
				connRes = graphClientResourceFactory(arguments[0], this.connection.connectedEntity, this.connection.connectedEntityProperty)
			}
			if(typeof(arguments[1]) == 'function') {
				success = arguments[1]; error = arguments[2];
			} else {
				relationshipData = arguments[1]; 
				success = arguments[2]; error = arguments[3];
			}
			if(!relationshipData) relationshipData = {};

			var d;
			if(connRes.id > 0) {
				d = { id: connRes.id };
			} else if(data) {
				d = data;
			}

			//check if connection already exists
			var connectionExists = false;
			for(var i in res[this.connection.property].data) {
				var r = res[this.connection.property].data[i].resource;
				if(r.id == connRes.id) {
					//add relationship data to existing connection
					$.extend(res[this.connection.property].data[i].relationship, relationshipData);
					connectionExists = true;
					break;
				}
			}

			if(connectionExists) { //add relationship data to inverse connection 
				for(var i in connRes[this.connection.connectedEntityProperty].data) {
					var r = connRes[this.connection.connectedEntityProperty].data[i].resource;
					if(r.id == res.id) {
						$.extend(connRes[this.connection.connectedEntityProperty].data[i].relationship, relationshipData);
						break;
					}
				}
			}

			if(!connectionExists) {
				//add connections to start and end entities, and increase count
				var connRelItm = new GraphClientRelatedItem(connRes, relationshipData);
				res[this.connection.property].data.push(connRelItm);
				if(!res[this.connection.property].count) res[this.connection.property].count = 0;
				res[this.connection.property].count++;

				var relItm = new GraphClientRelatedItem(res, relationshipData);
				connRes[this.connection.connectedEntityProperty].data.push(relItm);
				if(!connRes[this.connection.connectedEntityProperty].count) connRes[this.connection.connectedEntityProperty].count = 0;
				connRes[this.connection.connectedEntityProperty].count++;
			}

			GC.service('POST', constructUrl(entities[entityName].endpoint + '/' + res.id + '/' + this.connection.property),
				$.extend(d, {relationship: relationshipData }), function(d) {
				if(d.connectedEntityKey && !connRes.id) {
					connRes.id = d.connectedEntityKey;
				}
				if(success) success(d);
			}, function(err) {
				if(error) error(err);
			});
		}

		GraphClientConnectionProperty.prototype.$disconnect = function() {
			var connRes, success, error;
			connRes = (arguments[0] instanceof GraphClientRelatedItem ? arguments[0].resource : arguments[0]);
			success = arguments[1];
			error = arguments[2];

			//disconnect the objects
			res[this.connection.property].$remove(connRes.id);
			connRes[this.connection.connectedEntityProperty].$remove(res.id);

			//send DELETE request to server to save the disconnection
			GC.service('DELETE', constructUrl(entities[entityName].endpoint + '/' + res.id + '/' + this.connection.property + '/' + connRes.id),
				null, function(d) {
				if(success) success(d);
			}, function(err) {
				if(error) error(err);
			});
		}

		GraphClientConnectionProperty.prototype.$getPage = function() {
			var pageNumber, success, error;
			if(typeof(arguments[0]) == 'function') {
				success = arguments[0]; error = arguments[1];
			} else {
				pageNumber = arguments[0]; success = arguments[1]; error = arguments[2];
			}

			var $this = this;
			var url = entities[entityName].endpoint + '/' + res.id + '/' + this.connection.property;
			var urlParams = {};
			urlParams.limit = GC.pageSize;
			var numResults = res[$this.connection.property].data.length;
			if(numResults > 0) {
				urlParams.skip = numResults;
			}

			GC.service('GET', constructUrl(url, urlParams), null, function(d) {
				for(var i in d.data) {
					var relItm = new GraphClientRelatedItem(d.data[i], $this.connection.connectedEntity, entities[$this.connection.connectedEntity].endpoint)
					res[$this.connection.property].data.push(relItm);
				}
				if(success) success(d);
			}, function(err) {
				if(error) error(err);
			});
		}

		GraphClientConnectionProperty.prototype.$find = function(id) {
			var relItm;
			for(var i in res[this.connection.property].data) {
				var itm = res[this.connection.property].data[i];
				if(itm.resource.id == id) {
					relItm = itm;
					break;
				}
			}
			return relItm;
		}

		GraphClientConnectionProperty.prototype.$remove = function(id) {
			var relItmIdx;
			for(var i in res[this.connection.property].data) {
				var itm = res[this.connection.property].data[i];
				if(itm.resource.id == id) {
					relItmIdx = i;
					break;
				}
			}
			if(relItmIdx >= 0) {
				res[this.connection.property].data.splice(relItmIdx, 1);
			}
			res[this.connection.property].count = res[this.connection.property].data.length;
		}

		var res = new GraphClientResource(data);
		res.__resourceType = entityName;
		res.__endpoint = endpointName;
		for(var i in connectionProperties[entityName]) {
			var connProp = connectionProperties[entityName][i];
			res[connProp.property] = new GraphClientConnectionProperty(connProp);
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

	window.GraphClientRelatedItem = function GraphClientRelatedItem() {
		var data, relData, resource, entityName, endpointName;
		if(arguments[0] instanceof GraphClientResource) {
			resource = arguments[0];
			relData = arguments[1];
		} else {
			data = arguments[0];
			entityName = arguments[1];
			endpointName = arguments[2];
		}

		if(resource) {
			this.resource = resource;
			this.relationship = relData;
		} else {
			this.resource = graphClientResourceFactory(entityName, endpointName);
			this.relationship = (data.relationship ? data.relationship : {});
			$.extend(this.resource, data);
			this.resource.__setState();
		}
	}

	function constructUrl(url, params) {
		url = GC.rootUrl + '/' + url;
		if(!params) params = {};
		$.extend(params, GC.defaultParams);
		for(var p in params) {
			url = addQuerystringParam(url, p, params[p]);
		}
		return url;
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

	function addQuerystringParam(url, paramKey, paramVal) {
		if(url && paramKey && paramVal) {
			var url = (url.indexOf('?') > 0 ? url+'&' : url+'?');
			url = url + paramKey + '=' + paramVal;
		}
		return url;
	}

})(window);