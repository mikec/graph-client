function GC() { }

GC.setup = function(params) {
	if(params) {
		this.rootUrl = params.rootUrl;
	}
}

GC.define = function(value, pluralValue) {

	function GraphClientResource() {}
	GraphClientResource.create = function(data, success, error) {
		var res = new GraphClientResource();
		$.extend(res, data);

		$.ajax({
		  type: "POST",
		  url: GC.rootUrl + '/' + (pluralValue ? pluralValue : this.entityName+'s'),
		  data: { name: "Mike", location: "Boston" }
		}).done(function(data) {
			res.id = data.key;
			if(success) success(data);
		}).error(function(err) {
			if(error) error(err);
		});

		return res;
	}
	GraphClientResource.get = function(id) {

	}
	GraphClientResource.prototype.$save = function() {

	}

	if(value.indexOf('.' == -1)) { // define entity
		defineEntity(value);
	} else { // define connection
		defineConnection();
	}

	function defineEntity(entityName) {
		var cls = capitalize(entityName);
		window[cls] = function() {};
		window[cls].entityName = entityName;
		$.extend(window[cls], GraphClientResource);
	}

	function defineConnection(startConn, endConn) {

	}
}

function capitalize(string)
{
    return string.charAt(0).toUpperCase() + string.slice(1);
}