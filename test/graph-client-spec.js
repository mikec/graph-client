var _asyncTimeout = 1000;
var _testAccessToken = 'asdflkjas234987234kjasdf';
var _testGuid = 123098234098123098234;

var _testsStarted = false;

var users = [];
var bands = [];

(function beforeAll() {

	startTests();

})();

function startTests() {
	started = true;

	describe('Setup', function() {

		it('should configure based on server config and execute the ready function', function() {
			var done = false;
			runs(function() {
				GC.setup({
					rootUrl: 'http://localhost:3000',
					pageSize: 5,
					useServerConfig: true,
					ready: function() {
						done = true;
					},		
					defaultParams: {
						access_token: _testAccessToken,
						guid: _testGuid
					}
				});
				/*GC.define('user');	
				GC.define('band');
				GC.define('user.bands', 'band.members');
				GC.define('user.following', 'band.followers');*/
			});
			waitsFor(function() {
				return done;
			}, 'setup to be ready', _asyncTimeout);
		});

		it('should create a User class', function() {
			expect(User).toBeDefined();
			expect(User.create).toBeDefined();
		});
		
		it('should create a Band class', function() {
			expect(Band).toBeDefined();
			expect(Band.create).toBeDefined();
		});

		it('should define six entities', function() {
			expect(GC.entities['user']).toBeDefined();
			expect(GC.entities['band']).toBeDefined();
			var i = 0;
			for(var e in GC.entities) i++;
			expect(i).toBe(6);
		});

		it('should have a Band and a User class defined', function() {
			expect(User).toBeDefined();
			expect(User.create).toBeDefined();
			expect(Band).toBeDefined();
			expect(Band.create).toBeDefined();
		});

		it('should define an entity named user and an entity named band', function() {
			expect(GC.entities['user']).toBeDefined();
			expect(GC.entities['band']).toBeDefined();
		});

		it('should define start and end connection properties', function() {
			expect(GC.connectionProperties['user'].length).toBe(3);
			expect(GC.connectionProperties['band'].length).toBe(2);
		});

		it('should set page size to 5', function() {
			expect(GC.pageSize).toBe(5);
		});

		it('should have default params defined', function() {
			expect(GC.defaultParams.access_token).toBe(_testAccessToken);
			expect(GC.defaultParams.guid).toBe(_testGuid);
		});

		describe('Setup with a root URL that doesn\'t have a trailing slash', function() {

			beforeEach(function() {
				GC.setup({
					rootUrl: 'http://localhost:3000'
				});
			});

			it('should set a root url without a trailing slash', function() {
				expect(GC.rootUrl).toBe('http://localhost:3000');
			});

		});

		describe('Setup with a root URL that has a trailing slash', function() {

			beforeEach(function() {
				GC.setup({
					rootUrl: 'http://localhost:3000/'
				});
			});

			it('should set a root url without a trailing slash', function() {
				expect(GC.rootUrl).toBe('http://localhost:3000');
			});

		});

	});

	describe('Creating new objects', function() {

		it('should generate 25 objects for each type to use as test data', function() {
			var callbackNum = 0;
			runs(function() {
				for(var i = 0; i < 25; i++) {
					var u = User.create({name:"johnny rudebega", age:22, city:"Boston"}, function() {
						callbackNum++;
					});
					var b = Band.create({name:"the setup", genre:"emu"}, function() {
						callbackNum++;
					});
					users.push(u);
					bands.push(b);
				}
			});
			waitsFor(function() {
				return callbackNum == 50;
			}, 'objects to be generated', _asyncTimeout);
			runs(function() {
				expect(users.length).toBe(25);
				expect(bands.length).toBe(25);
			});
		});

		it('should be of the correct type', function() {
			expect(users[0].__resourceType).toBe('user');
			expect(users[0].__endpoint).toBe('users');
			expect(bands[0].__resourceType).toBe('band');
			expect(bands[0].__endpoint).toBe('bands');
		});

	});
		
	describe('Creating a user', function() {

		var user;

		beforeEach(function() {
			runs(function() {
				user = User.create({name:'mike', city:'Boston', hair:'brown', age:30});
			});
		});

		it('should return an instance of the user with the correct properties', function() {
			expect(user.$save).toBeDefined();
			expect(user.name).toBe('mike');
		});

		it('should set the user\'s id after the server responds with the key of the new user', function() {

			waitsFor(function() {
				return user.id > 0;
			}, 'user.id should be greater than 0', _asyncTimeout);

			runs(function() {
				expect(user.id).toBeGreaterThan(0);
			});
			
		});

		describe('Getting the user that was created', function() {

			var u;

			beforeEach(function() {
				waitsFor(function() {
					return user.id > 0;
				}, 'user.id should be greater than 0', _asyncTimeout);
				runs(function() {
					u = User.get(user.id);
					expect(u).toBeDefined();
				});
				waitsFor(function() {
					return u.id > 0;
				}, 'u.id should be greater than 0', _asyncTimeout);
			});

			it('should return a user object with the correct properties', function() {

				runs(function() {
					expect(u.id).toBeGreaterThan(0);
				});

			});

			describe('Modifying properties of the user, saving, then getting again', function() {

				var u2;

				beforeEach(function() {
					u.city = 'New York';
					u.nickname = 'the dude';
					var saveComplete = false;
					runs(function() {
						u.$save(function() {
							saveComplete = true;
						});
					});
					waitsFor(function() {
						return saveComplete;
					}, 'save to be complete', _asyncTimeout);
					runs(function() {
						u2 = User.get(u.id);
					});
					waitsFor(function() {
						return u2.id > 0;
					}, 'u2.id should be greater than 0', _asyncTimeout);
				});

				it('should return a user with the new properties', function() {
					runs(function() {
						expect(u2.name).toBe('mike');
						expect(u2.city).toBe('New York');
						expect(u2.nickname).toBe('the dude');
					});
				});

			});

			describe('Syncing the user with the database after the database was updated', function() {

				beforeEach(function() {					
					var tmpUsr;
					var syncComplete = false;
					u.car = 'hyundai';
					runs(function() {
						tmpUsr = User.get(u.id, function() {
							tmpUsr.weight = '145lbs';
							tmpUsr.$save(function() {
								u.$sync(function() {
									syncComplete = true;
								});
							});
						});
					});
					waitsFor(function() { return syncComplete; }, 'sync to be complete', _asyncTimeout);
				});

				it('should save the correct data', function() {
					var tmpUsr;
					var getComplete = false;
					runs(function() {
						expect(u.car).toBe('hyundai');
						tmpUsr = User.get(u.id, function() {
							getComplete = true;
						});
					});
					waitsFor(function() { return getComplete; }, 'get to be complete', _asyncTimeout);
					runs(function() {
						expect(tmpUsr.car).toBe('hyundai');
					});
				});

				it('should update the user object with the correct data', function() {
					runs(function() {
						expect(u.weight).toBe('145lbs');
					});
				});

			});

			describe('Deleting the user', function() {

				var initialID;

				beforeEach(function() {
					initialID = u.id;
					var deleteComplete = false;
					runs(function() {
						u.$delete(function() {
							deleteComplete = true;
						});
					});
					waitsFor(function() {
						return deleteComplete;
					}, 'delete to be complete', _asyncTimeout);
				});

				it('should delete all properties from the user object', function() {
					runs(function() {
						expect(u.name).not.toBeDefined();
						expect(u.city).not.toBeDefined();
						expect(u.id).not.toBeDefined();
					});
				});

				describe('Attempting to get the deleted user', function() {

					it('should return an empty object', function() {
						var getComplete = false;
						u2 = null;
						runs(function() {
							u2 = User.get(initialID, function() {
								getComplete = true;
							});
						});
						waitsFor(function() { return getComplete; }, 'get to be complete', _asyncTimeout);
						runs(function() {
							expect(u2.id).not.toBeDefined();
						});
					});

				});

			});

		});

	});

	describe('Creating a user with a specified key', function() {

		var uid = '123456789';

		beforeEach(function() {
			var done = false;
			var user;
			runs(function() {
				var tmpUsr = User.get(uid, function() {
					if(tmpUsr.id > 0) {
						tmpUsr.$delete(function() {
							done = true;
						});
					} else {
						done = true;
					}
				}, function() {
					done = true;
				});
			});
			waitsFor(function() {
				return done;
			}, 'cleanup of user ' + uid + ' to be done', _asyncTimeout);
			runs(function() {
				done = false;
				user = User.create(uid, {name:'jenn jacobson'}, function() {
					done = true;
				});
			});
			waitsFor(function() { return done; }, 'user creation to be done', _asyncTimeout);
		});

		it('should create user ' + uid, function() {
			var done = false;
			var u;
			runs(function() {
				u = User.get(uid, function() { done = true; });
			});
			waitsFor(function() { return done; }, 'user get to be done', _asyncTimeout);
			runs(function() {
				expect(u.id).toBe(uid);
			});
		});

	});

	describe('Creating a band and a user', function() {

		var user, band;

		beforeEach(function() {
			runs(function() {
				user = User.create({name:'mike', city:'Boston', hair:'brown', age:30});
				band = Band.create({name:'gods of rock', city:'London', genre:'metal'});
			});
		});

		it('should return an instance of the user and the band with the correct properties', function() {
			expect(user.$save).toBeDefined();
			expect(user.name).toBe('mike');
			expect(band.$save).toBeDefined();
			expect(band.name).toBe('gods of rock');
		});

		it('should return an instance of the user and the band with the correct connection properties', function() {
			expect(user.bands).toBeDefined();
			expect(user.bands.$connect).toBeDefined();
			expect(band.members).toBeDefined();
			expect(band.members.$connect).toBeDefined();
		});

		it('should set the user\'s id after the server responds with the key of the new user', function() {

			waitsFor(function() {
				return user.id > 0;
			}, 'user.id should be greater than 0', _asyncTimeout);

			runs(function() {
				expect(user.id).toBeGreaterThan(0);
			});
			
		});

		it('should set the band\'s id after the server responds with the key of the new band', function() {

			waitsFor(function() {
				return band.id > 0;
			}, 'band.id should be greater than 0', _asyncTimeout);

			runs(function() {
				expect(band.id).toBeGreaterThan(0);
			});
			
		});

		describe('Getting the band and the user that were created', function() {

			var u, b;

			beforeEach(function() {
				waitsFor(function() {
					return (user.id > 0 && band.id > 0);
				}, 'user.id and band.id should be greater than 0', _asyncTimeout);
				runs(function() {
					u = User.get(user.id);
					b = Band.get(band.id);
					expect(u).toBeDefined();
					expect(b).toBeDefined();
				});
				waitsFor(function() {
					return (u.id > 0 && b.id > 0);
				}, 'u.id and b.id should be greater than 0', _asyncTimeout);
			});

			it('should return a user object and a band object with the correct properties', function() {

				runs(function() {
					expect(u.id).toBeGreaterThan(0);
					expect(b.id).toBeGreaterThan(0);
				});

			});

			describe('Connecting the user and the band', function() {

				var u2, b2;

				beforeEach(function() {
					var done = false;
					runs(function() {
						u.bands.$connect(b, function() {
							u2 = User.get(u.id, {includeConnections:true}, function() {
								b2 = Band.get(b.id, {includeConnections:true}, function() {
									done = true;
								});
							});
						});
					});
					waitsFor(function() {
						return done;
					}, 'service call to be done', _asyncTimeout);
				});

				it('should populate the connection properties on existing resources', function() {
					runs(function() {
						expect(u.bands.data.length).toBe(1);
						expect(b.members.data.length).toBe(1);
					});
				});

				it('should populate the connection properties when getting new resources from the database', function() {
					runs(function() {
						expect(u2.bands.data.length).toBe(1);
						expect(b2.members.data.length).toBe(1);
					});
				});

				it('should populate the connection properties with resources', function() {
					runs(function() {
						expect(u2.bands.data[0].resource.$save).toBeDefined();
						expect(b2.members.data[0].resource.$save).toBeDefined();
					});
				});

				describe('Getting the user and the band using .getAll', function() {

					beforeEach(function() {
						var done = false;
						runs(function() {
							u2 = User.getAll(u.id, function() {
								b2 = Band.getAll(b.id, function() {
									done = true;
								});
							});
						});
						waitsFor(function() { return done; }, 'service call to be done', _asyncTimeout);
					});
					
					it('should populate the connection properties when getting new resources from the database', function() {
						runs(function() {
							expect(u2.bands.data.length).toBe(1);
							expect(b2.members.data.length).toBe(1);
						});
					});

					it('should populate the connection properties with resources', function() {
						runs(function() {
							expect(u2.bands.data[0].resource.$save).toBeDefined();
							expect(b2.members.data[0].resource.$save).toBeDefined();
						});
					});

				});

				describe('Calling connect on objects that are already connected', function() {

					var done = false;
					beforeEach(function() {
						runs(function() {
							u.bands.$connect(b, function() {
								done = true;
							}, function(err) {
								done = true;
							});
						});
					});

					it('should only have one object in the connection property array before result is returned', function() {
						expect(u.bands.data.length).toBe(1);
						expect(b.members.data.length).toBe(1);
					});

					it('should only have one object in the connection property array after result is returned', function() {
						waitsFor(function() { return done; }, 'service call to be done', _asyncTimeout);
						expect(u.bands.data.length).toBe(1);
						expect(b.members.data.length).toBe(1);
					});					

				});

				describe('Perform a $sync on a resource with connections', function() {
					
					var done = false;
					beforeEach(function() {
						runs(function() {
							u.$sync(function() {
								done = true;
							});
						});
						waitsFor(function() { return done; }, 'service call to be done', _asyncTimeout);
					});

					it('should maintain the original connection properties on the resource', function() {
						runs(function() {
							expect(u.bands.data.length).toBe(1);
						});
					});

				});

			});

			describe('Connecting the user and the band with relationship data', function() {

				var u2, b2;

				it('should add the relationship data to connections on both resource before service call', function() {
					u.bands.$connect(b, { instrument: 'drums' });
					expect(u.bands.data[0].relationship.instrument).toBe('drums');
					expect(b.members.data[0].relationship.instrument).toBe('drums');
				});

				it('should return relationship data when getting the connected objects', function() {
					var done = false;
					runs(function() {
						u.bands.$connect(b, { instrument: 'drums' }, function() {
							u2 = User.getAll(u.id, function() {
								b2 = Band.getAll(b.id, function() {
									done = true;
								});
							});
						});
					});
					waitsFor(function() { return done; }, 'service call to be done', _asyncTimeout);
					runs(function() {
						expect(u2.bands.data[0].relationship.instrument).toBe('drums');
						expect(b2.members.data[0].relationship.instrument).toBe('drums');
					});
				});

				describe('Updating the properties of a relationship', function() {

					beforeEach(function() {
						var done = false;
						runs(function() {
							u.bands.$connect(b, { instrument: 'drums' }, function() {
								done = true;
							});
						});
						waitsFor(function() { return done; }, 'service call to be done', _asyncTimeout);
					});

					it('should update properties before service call', function() {
						u.bands.$connect(b, { instrument: 'guitar', memberSince: 'last week' });
						expect(u.bands.data[0].relationship.instrument).toBe('guitar');
						expect(b.members.data[0].relationship.instrument).toBe('guitar');
						expect(u.bands.data[0].relationship.memberSince).toBe('last week');
						expect(b.members.data[0].relationship.memberSince).toBe('last week');
					});

					it('should update properties after service call', function() {
						var done = false;
						runs(function() {
							u.bands.$connect(b, { instrument: 'guitar', memberSince: 'last week' }, function() {
								u2 = User.getAll(u.id, function() {
									b2 = Band.getAll(b.id, function() {
										done = true;
									});
								});
							});
						});
						waitsFor(function() { return done; }, 'service call to be done', _asyncTimeout);
						runs(function() {
							expect(u2.bands.data[0].relationship.instrument).toBe('guitar');
							expect(b2.members.data[0].relationship.instrument).toBe('guitar');
							expect(u2.bands.data[0].relationship.memberSince).toBe('last week');
							expect(b2.members.data[0].relationship.memberSince).toBe('last week');
						});
					});

				});

			});

			describe('Connecting the user to a newly created band', function() {

				var done;

				beforeEach(function() {
					done = false;
					runs(function() {
						u.bands.$connect({name:'coconut', genre:'fruit'}, function() {
							done = true;
						});
					});
				});

				it('should create a new band resource before the server response', function() {
					expect(u.bands.data.length).toBe(1);
					expect(u.bands.data[0].resource.name).toBe('coconut');
				});

				it('should update the resource with an id after server response', function() {
					waitsFor(function() { return done; }, 'server response', _asyncTimeout);
					runs(function() {
						expect(u.bands.data.length).toBe(1);
						expect(u.bands.data[0].resource.name).toBe('coconut');
						expect(u.bands.data[0].resource.id).toBeGreaterThan(0);
					});
				});

				it('should be able to get the newly created band from the server', function() {
					var b2;
					waitsFor(function() { return done; }, 'server response', _asyncTimeout);
					runs(function() {
						done = false;
						b2 = Band.getAll(u.bands.data[0].resource.id, function() {
							done = true;
						});
					});
					waitsFor(function() { return done; }, 'server response', _asyncTimeout);
					runs(function() {
						expect(b2.id).toBe(u.bands.data[0].resource.id);
						expect(b2.members.data.length).toBe(1);
						expect(b2.members.data[0].resource.id).toBe(u.id);
					});
				});

			});

			describe('Connecting the user to a newly created band with relationship data', function() {

				var done;

				beforeEach(function() {
					done = false;
					runs(function() {
						u.bands.$connect({name:'coconut', genre:'fruit'}, {instrument:'banjo', memberSince:'yesterday'}, function() {
							done = true;
						});
					});
				});

				it('should create a new related item with resource and relationship data before the server response', function() {
					expect(u.bands.data.length).toBe(1);
					expect(u.bands.data[0].resource.name).toBe('coconut');
					expect(u.bands.data[0].relationship.instrument).toBe('banjo');
				});

				it('should update the resource with an id after server response, and not affect relationship data', function() {
					waitsFor(function() { return done; }, 'server response', _asyncTimeout);
					runs(function() {
						expect(u.bands.data.length).toBe(1);
						expect(u.bands.data[0].resource.name).toBe('coconut');
						expect(u.bands.data[0].resource.id).toBeGreaterThan(0);
						expect(u.bands.data[0].relationship.instrument).toBe('banjo');
					});
				});

				it('should be able to get the newly created band from the server, with relationship data included', function() {
					var b2;
					waitsFor(function() { return done; }, 'server response', _asyncTimeout);
					runs(function() {
						done = false;
						b2 = Band.getAll(u.bands.data[0].resource.id, function() {
							done = true;
						});
					});
					waitsFor(function() { return done; }, 'server response', _asyncTimeout);
					runs(function() {
						expect(b2.id).toBe(u.bands.data[0].resource.id);
						expect(b2.members.data.length).toBe(1);
						expect(b2.members.data[0].resource.id).toBe(u.id);
						expect(b2.members.data[0].relationship.instrument).toBe('banjo');
					});
				});

			});

		});

	});

	describe('Getting paged properties', function() {

		var band;

		it('should create a new band and connect 25 users as followers', function() {
			var n = 0;
			runs(function() {
				band = Band.create({name:"Fried Chicken", genre:"pop"}, function() {
					for(var i=0; i < 25; i++) {
						users[i].following.$connect(band, function() {
							n++;
						});
					}
				});
			});
			waitsFor(function() {
				return n == 25;
			}, 'all users to be connected', _asyncTimeout);
			runs(function() {
				expect(band.followers.data.length).toBe(25);
			});
		});

		it('should be able to get a follower from the collection property by its id', function() {
			var b;
			runs(function() {
				b = Band.getAll(band.id);
			});
			waitsFor(function() { return b.id > 0; }, 'service call to be done', _asyncTimeout);
			runs(function() {
				var f = b.followers.$find(users[3].id);
				expect(f.resource.id).toBe(users[3].id);
			});
		});

		it('should only return 5 followers when getting the band', function() {
			var b;
			runs(function() {
				b = Band.getAll(band.id);
			});
			waitsFor(function() { return b.id > 0; }, 'service call to be done', _asyncTimeout);
			runs(function() {
				expect(b.followers.data.length).toBe(5);
				var idsMatch = true;
				for(var i in b.followers.data) {
					idsMatch = (b.followers.data[i].id == band.followers.data[i].id);
					if(!idsMatch) break;
				}
				expect(idsMatch).toBe(true);
			});
		});

		it('should add 5 more followers when getting the next page', function() {
			var b; var done = false;
			runs(function() {
				b = Band.getAll(band.id, function() {
					b.followers.$getPage(function() {
						done = true;
					});
				});
			});
			waitsFor(function() { return done; }, 'service call to be done', _asyncTimeout);
			runs(function() {
				expect(b.followers.data.length).toBe(10);
				var idsMatch = true;
				for(var i in b.followers.data) {
					idsMatch = (b.followers.data[i].id == band.followers.data[i].id);
					if(!idsMatch) break;
				}
				expect(idsMatch).toBe(true);
			});
		});

		it('should add 10 more followers when getting two pages consecutively', function() {
			var b; var done = false;
			runs(function() {
				b = Band.getAll(band.id, function() {
					b.followers.$getPage(function() {
						b.followers.$getPage(function() {
							done = true;
						});
					});
				});
			});
			waitsFor(function() { return done; }, 'service call to be done', _asyncTimeout);
			runs(function() {
				expect(b.followers.data.length).toBe(15);
				var idsMatch = true;
				for(var i in b.followers.data) {
					idsMatch = (b.followers.data[i].id == band.followers.data[i].id);
					if(!idsMatch) break;
				}
				expect(idsMatch).toBe(true);
			});
		});

	});
}