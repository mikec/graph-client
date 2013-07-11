var graphsvc = require('graphsvc');

var app = graphsvc("http://localhost:7474");

//allow cross-domain access
app.use(function(req, res, next) {
	//set response header to allow cross-domain requests
	res.set('Access-Control-Allow-Origin', '*');
	res.set('Access-Control-Allow-Methods', 'GET,POST,DELETE');
	res.set('Access-Control-Allow-Headers', 'accept, origin, content-type');

	if(req && req.method == 'OPTIONS') {
		res.send(200);
	}

	next();
});

app.endpoint("thing")
   .endpoint("user")
   .endpoint("band")
   .endpoint("song")
   .endpoint("genre", {"key": "name"})
   .endpoint("person", {"collectionName": "people"})
   .endpoint("user.bands", "band.members", "is_member_of")	
   .endpoint("user.friends", "is_friends_with")
   .endpoint("thing.parts", "has_part")
   
   .get('/CurrentTime', function(req, res) {
		res.send({'current_time': new Date().toUTCString()});
   })
   
   .accessRule("create", "thing", function(reqInfo, entityData) {
		if(!entityData) return;
		if(entityData.color == 'green') throw new Error("No green things allowed");
		else entityData.created = new Date().toUTCString();
	})
	
   .accessRule("create,update,delete", "band", function(reqInfo, entityData) {
		if(!entityData) return;
		if(entityData.name == "the beef patties") throw new Error("That band name sucks");
		else if(entityData.name == "the smokin joes") entityData.created = new Date().toUTCString();
	})
	
   .accessRule("read", "thing", function(reqInfo, entityData) {
		if(!entityData) return;
		if(entityData.color == "red") {
			if(reqInfo.request.query.accesstoken == "abc123") {
				entityData.color = "red(modified)";
			} else throw new Error("You're not allowed to view red things");
		}
	})
   
   .accessRule("create", "user.bands", function(reqInfo, baseEntityData, connectedEntityData, connectionData) {
		if(!baseEntityData || !connectedEntityData || !connectionData) return;
		if(baseEntityData.fbid == 444 && connectedEntityData.fbid == 445 && connectionData.instrument == "maracas") throw new Error("user[fbid=444] can't play maracas for band[fbid=445]");
		if(baseEntityData.fbid == 446 && connectedEntityData.fbid == 445 && connectionData.instrument == "maracas") throw new Error("band[fbid=445] can't let user[fbid=446] play maracas");
	})
   
   .accessRule("create", "band.members", function(reqInfo, baseEntityData, connectedEntityData, connectionData) {
		if(!baseEntityData || !connectedEntityData || !connectionData) return;
		if(baseEntityData.fbid == 447 && connectedEntityData.fbid == 448 && connectionData.instrument == "cowbell") throw new Error("user[fbid=447] can't play cowbell for band[fbid=448]");
		if(baseEntityData.fbid == 449 && connectedEntityData.fbid == 448 && connectionData.instrument == "cowbell") throw new Error("band[fbid=448] can't let user[fbid=449] play cowbell");
	});

app.listen(3000);