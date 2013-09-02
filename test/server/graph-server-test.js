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
   .endpoint("user.following", "band.followers", "is_following")	
   .endpoint("user.friends", "is_friends_with")
   .endpoint("thing.parts", "has_part")
   .endpoint("band.songs", "song.owners", "is_owner_of")
   .endpoint("user.promotions", "song.promoters", "promoted")

   //custom connection property
   .endpoint("band.connectedBands", function(keyValue, options) {
   		var connBands = {};
   		return app.executeCypherQuery(
   			"START b1 = node:bands(id={bandId}) MATCH b1<-[r:is_member_of]-u1<-[r2:is_friends_with]->u2-[r3:is_member_of]->b2 RETURN COUNT(b2)",
   			{bandId:keyValue})
   		.then(function(r) {
			connBands.count = r.body.data[0][0];
			var query = "START b1 = node:bands(id={bandId}) MATCH b1<-[r:is_member_of]-u1<-[r2:is_friends_with]->u2-[r3:is_member_of]->b2 RETURN b2";
			if(options.skip) query += " SKIP " + options.skip;
			if(options.limit) query += " LIMIT " + options.limit;
			return app.executeCypherQuery(query, {bandId:keyValue});
		})
		.then(function(r) {
			connBands.data = [];
			for(var i in r.body.data) {
				var d = r.body.data[i][0].data;
				d.__resourceType = 'band';
				connBands.data.push(d);
			}
			return app.q.fcall(function() { return connBands; });
		});
   })

   .endpoint("topsongs", function(graphReq) {
   		var query = "START s = node:songs('*:*') MATCH s<-[?:promoted]-u, s<-[:is_owner_of]-b RETURN s, b, COUNT(u) AS promo_count ORDER BY promo_count DESC, s.id";
   		if(!graphReq.skip) graphReq.skip = 0;
   		if(!graphReq.limit) graphReq.limit = 100;
   		query += " SKIP " + graphReq.skip;
		query += " LIMIT " + graphReq.limit;
   		return app.executeCypherQuery(query).then(function(r) {
   			var topSongs = [];
			for(var i in r.body.data) {
				var d = r.body.data[i][0].data;
				d.__owner = r.body.data[i][1].data;
				d.__promotions = r.body.data[i][2];
				d.__resourceType = 'song';
				topSongs.push(d);
			}
   			return app.q.fcall(function() { return topSongs; });
   		});
   })

   .before('create', 'user', function(data, graphReq, next) {
   		if(data && data.id == 878787) {
   			data.created = new Date().getTime();
   			next();
   		} else {
   			next();
   		}
   })

   .after('create', 'user', function(resData, graphReq, next) {
   		if(resData && resData.key == 989898) {
   			app.updateIndexedNode({
   				id: 989898,
   				newProp: 'new prop val'
   			}, 'users').then(function() {
   				resData.data.newProp = 'new prop val';
   				next();
   			});
   		} else {
   			next();
   		}
   })

   .before('create', 'band', function(data, graphReq, next) {
      if(data && data.id == 797979797979) {
         data.createdPre = 'bandtest';
      }
      next();
   })

   .before('create', '*', function(data, graphReq, next) {
      if(data && (data.id == 8080808080808 || data.id == 6767676767676)) {
         data.createdAll = 'allTest';
      }
      next();
   })

   .before('connect', 'user.bands', function(data, graphReq, next) {
      if(data && data.band && data.user) {
         if(data.user.id == 919191919191919) {
            data.band.created = "thisinstant";
            data.relationship.status = "pending";
         } else if(data.band.id == 92929292929292) {
            data.relationship.created = "rightnow";
         }
      }
      next();
   })   

   .before('connect', 'band.members', function(data, graphReq, next) {
      if(data && data.band && data.user) {
         if(data.band.id == 94949494949494949) {
            data.relationship.firsttime = "yes";
         }
      }
      next();
   })

   .before('disconnect', 'band.followers', function(data, graphReq, next) {
      next();
   })
   .after('disconnect', 'band.followers', function(data, graphReq, next) {
      next();
   })
   
   .get('/CurrentTime', function(req, res) {
		res.send({'current_time': new Date().toUTCString()});
   });

app.listen(3000);