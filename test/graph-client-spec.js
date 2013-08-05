var _asyncTimeout = 5000;
var _asyncLongTimeout = 15000;
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

		it('should have a custom property on the band entity', function() {
			expect(GC.entities["band"].customProperties[0]).toBe('connectedBands');
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
			expect(GC.entities['song']).toBeDefined();
		});

		it('should define start and end connection properties', function() {
			expect(GC.connectionProperties['user'].length).toBe(4);
			expect(GC.connectionProperties['band'].length).toBe(3);
			expect(GC.connectionProperties['song'].length).toBe(2);
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
			}, 'objects to be generated', _asyncLongTimeout);
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

				describe('Disconnecting the user and the band', function() {

					it('should disconnect the user and the band before server response', function() {
						u.bands.$disconnect(b);
						expect(u.bands.data.length).toBe(0);
						expect(b.members.data.length).toBe(0);
					});

					it('should disconnect the user and the band after server response', function() {	
						var _u, _b;				
						var done = false;
						runs(function() {
							u.bands.$disconnect(b, function() { done = true; });
						});
						waitsFor(function() { return done; }, 'service call', _asyncTimeout);
						runs(function() {
							done = false;
							_u = User.getAll(u.id, function() {
								_b = Band.getAll(b.id, function() {
									done = true;
								});
							});
						});
						waitsFor(function() { return done; }, 'service call', _asyncTimeout);
						runs(function() {
							expect(_u.bands.data.length).toBe(0);
							expect(_b.members.data.length).toBe(0);
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

				it('should create a new band resource before the server response', function() {
					u.bands.$connect({name:'coconut', genre:'fruit'}, function() {
						done = true;
					});
					expect(u.bands.data.length).toBe(1);
					expect(u.bands.data[0].resource.name).toBe('coconut');
					expect(u.bands.data[0].resource.id).not.toBeDefined();
				});

				it('should update the resource with an id after server response', function() {
					var done = false;
					runs(function() {
						u.bands.$connect({name:'coconut', genre:'fruit'}, function() {
							done = true;
						});
					});
					waitsFor(function() { return done; }, 'server response', _asyncTimeout);
					runs(function() {
						expect(u.bands.data.length).toBe(1);
						expect(u.bands.data[0].resource.name).toBe('coconut');
						expect(u.bands.data[0].resource.id).toBeGreaterThan(0);
					});
				});

				it('should be able to get the newly created band from the server', function() {
					var b2;
					var done = false;
					runs(function() {
						u.bands.$connect({name:'coconut', genre:'fruit'}, function() {
							done = true;
						});
					});
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
						expect(b2.name).toBe('coconut');
						expect(b2.genre).toBe('fruit');
						expect(b2.members.data.length).toBe(1);
						expect(b2.members.data[0].resource.id).toBe(u.id);
					});
				});

			});

			describe('Connecting the user to a newly created band with relationship data', function() {

				it('should create a new related item with resource and relationship data before the server response', function() {
					u.bands.$connect({name:'coconut', genre:'fruit'}, {instrument:'banjo', memberSince:'yesterday'}, function() {
						done = true;
					});
					expect(u.bands.data.length).toBe(1);
					expect(u.bands.data[0].resource.name).toBe('coconut');
					expect(u.bands.data[0].relationship.instrument).toBe('banjo');
					expect(u.bands.data[0].resource.id).not.toBeDefined();
				});

				it('should update the resource with an id after server response, and not affect relationship data', function() {			
					var done = false;
					runs(function() {
						u.bands.$connect({name:'coconut', genre:'fruit'}, {instrument:'banjo', memberSince:'yesterday'}, function() {
							done = true;
						});
					});
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
					var done = false;
					runs(function() {
						u.bands.$connect({name:'coconut', genre:'fruit'}, {instrument:'banjo', memberSince:'yesterday'}, function() {
							done = true;
						});
					});
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
						expect(b2.name).toBe('coconut');
						expect(b2.genre).toBe('fruit');
						expect(b2.members.data.length).toBe(1);
						expect(b2.members.data[0].resource.id).toBe(u.id);
						expect(b2.members.data[0].relationship.instrument).toBe('banjo');
					});
				});

			});

		});

	});

	describe('Getting paged properties and counting them', function() {

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

		it('should set the count property of followers to 25', function() {
			expect(band.followers.count).toBe(25);
		});

		it('should be able to get a follower from the collection property by its id', function() {
			var b, f;
			runs(function() {
				b = Band.getAll(band.id, { pageSize: 25 });
			});
			waitsFor(function() { 
				return (b.id > 0 && (b.followers && b.followers.data.length > 0));
			}, 'service call to be done', _asyncTimeout);
			runs(function() {
				f = b.followers.$find(users[3].id);
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

		it('should set the total number of followers when getting only one page of followers', function() {
			var b;
			runs(function() {
				b = Band.getAll(band.id);
			});
			waitsFor(function() { return b.id > 0; }, 'service call to be done', _asyncTimeout);
			runs(function() {
				expect(b.followers.data.length).toBe(5);
				expect(b.followers.count).toBe(25);
			});
		});

		it('should have a member count of 0', function() {
			var b;
			runs(function() {
				b = Band.getAll(band.id);
			});
			waitsFor(function() { return b.id > 0; }, 'service call to be done', _asyncTimeout);
			runs(function() {
				expect(b.members.data.length).toBe(0);
				expect(b.members.count).toBe(0);
			});
		});

		describe('Removing 3 followers', function() {

			it('should return 3 less followers when getting the band again', function() {
				var b;
				var finished;
				runs(function() {
					finished = false;
					var f1 = band.followers.data[6];
					var f2 = band.followers.data[7];
					var f3 = band.followers.data[8];
					band.followers.$disconnect(f1, function() {
						band.followers.$disconnect(f2, function() {					
							band.followers.$disconnect(f3, function() {
								b = Band.getAll(band.id, function() {
									finished = true;
								});
							});
						});
					});		
				});
				waitsFor(function() { return finished; }, '3 followers to be disconnected', _asyncTimeout);
				runs(function() {
					expect(b.followers.count).toBe(22);
				});
			});

			/*
			// THIS TEST WILL PASS, BUT THE RELATIONSHIP DELETE IN NEO4J WILL FAIL:
			// major issue with deleting relationships consecutively. 
			// neo4j http service always returns 500 unknown error when trying to delete the 3rd relationship
			// even though the relationship exists
			*/
			/*it('should reduce the followers count by 3 before the server response', function() {
				var i = 0;
				runs(function() {
					var f1 = band.followers.data[6];
					var f2 = band.followers.data[7];
					var f3 = band.followers.data[8];
					band.followers.$disconnect(f1, function() { 
						i++; 
					});
					band.followers.$disconnect(f2, function() { 
						i++; 
					});
					band.followers.$disconnect(f3, function() { 
						i++; 
					});
					expect(band.followers.count).toBe(19);
				});
				waitsFor(function() { return i == 3; }, '3 followers to be disconnected', _asyncTimeout);
				runs(function() {});
			});*/

		});

		describe('Adding 3 more followers', function() {

			it('should return 3 more followers when getting the band again', function() {
				var b;
				var finished;
				runs(function() {
					band.followers.$connect({name:'jim1'}, function() {
						band.followers.$connect({name:'jim2'}, function() {
							band.followers.$connect({name:'jim3'}, function() {
								b = Band.getAll(band.id, function() {
									finished = true;
								});
							});
						});
					});
				});
				waitsFor(function() { return finished; }, '3 followers to be connected', _asyncTimeout);
				runs(function() {
					expect(b.followers.count).toBe(25);
				});
			});

			it('should increase the followers count by 1 before the server response', function() {
				band.followers.$connect({name:'jim4'});
				expect(band.followers.count).toBe(26);
			});

		});

	});

	describe('Getting a custom connection property', function() {

		var user1, user2, band1, band2, band3, band4;

		beforeEach(function() {
			var done = false;
			runs(function() {
				user1 = User.create({name:"Dave Jameson", age:26}, function() {
					user2 = User.create({name:"Janet Dorado", age:23}, function() {
						band1 = Band.create({name:"The Bro-tones", genre:"Jock Rock"}, function() {
							band2 = Band.create({name:"The Bonifide Hustlers", genre:"Pure Awesomeness"}, function() {
								band1.members.$connect(user1, function() {
									band2.members.$connect(user2, function() {
										user1.friends.$connect(user2, function() {
											band3 = Band.create({name:"junkasaurus-rex", genre:"complete and utter garbage"}, function() {
												band4 = Band.create({name:"Skalami", genre:"deli meat ska"}, function() {
													band3.members.$connect(user2, function() {
														band4.members.$connect(user2, function() {
															done = true;
														});
													});
												});
											});
										});
									});
								});
							});
						});
					});
				});			
			});
			waitsFor(function() { return done; }, 'server response', _asyncTimeout);
			runs(function() { });
		});

		it('should respond with 3 items in the \'connectedBands\' property', function() {
			var b1, b2;
			var done = false;
			runs(function() {
				b1 = Band.getAll(band1.id, function() {
					b2 = Band.getAll(band2.id, function() {
						done = true;
					});
				});
			});
			waitsFor(function() { return done; }, 'server response', _asyncTimeout);
			runs(function() { 
				expect(b1.connectedBands.data.length).toBe(3);
				expect(b2.connectedBands.data.length).toBe(1);
				expect(b1.connectedBands.data[0].resource.id).toBe(b2.id);
				expect(b2.connectedBands.data[0].resource.id).toBe(b1.id);
			});
		});

	});

	describe('Getting a custom paged endpoint', function() {

		var topSongs;
		var u1, u2, u3, u4, b1, b2, b3;

		it('should successfully get from the endpoint, after data is setup', function() {
			var done = false;
			// create user and bands, and have user follow each band
			runs(function() {
				u1 = User.create({name:'mark'}, function() {
					b1 = Band.create({name:'the totally awesomes'}, function() {
						b2 = Band.create({name:'praying mantis'}, function() {
							b3 = Band.create({name:'floss angeles'}, function() {
								u1.following.$connect(b1, function() {
									u1.following.$connect(b2, function() {
										u1.following.$connect(b3, function() {
											u2 = User.create({name:'bill'}, function() {
												u3 = User.create({name:'john'}, function() {
													u4 = User.create({name:'lilly'}, function() {
														done = true;
													});
												});
											});
										});
									});
								});
							});
						});
					});
				});
			});
			waitsFor(function() { return done; }, 'server response', _asyncLongTimeout);
			// create 10 songs for each band
			runs(function() {
				done = false;
				function connectSongs(band, songNum, limit, doneFn) {
					if(songNum > limit) {
						doneFn();
					} else {
						band.songs.$connect({name: "song " + songNum}, function() {
							connectSongs(band, songNum + 1, limit, doneFn);
						});					
					}
				}
				connectSongs(b1, 1, 10, function() {
					connectSongs(b2, 1, 10, function() {
						connectSongs(b3, 1, 10, function() {
							done = true;
						});
					});
				});
			});
			waitsFor(function() { return done; }, 'server response', _asyncLongTimeout);
			//have users promote songs
			runs(function() {
				done = false;
				u1.promotions.$connect(b1.songs.data[1].resource, function() {
					u2.promotions.$connect(b1.songs.data[1].resource, function() {
						u3.promotions.$connect(b1.songs.data[1].resource, function() {
							u4.promotions.$connect(b1.songs.data[1].resource, function() {
								u1.promotions.$connect(b2.songs.data[4].resource, function() {
									u2.promotions.$connect(b2.songs.data[4].resource, function() {
										u3.promotions.$connect(b3.songs.data[6].resource, function() {
											u4.promotions.$connect(b3.songs.data[6].resource, function() {
												done = true;
											});
										});
									});
								});
							});
						});
					});
				});
			});
			waitsFor(function() { return done; }, 'server response', _asyncLongTimeout);
			runs(function() { 
				expect(b1.songs.data.length).toBe(10);
				expect(b2.songs.data.length).toBe(10);
				expect(b3.songs.data.length).toBe(10);
				expect(u1.promotions.data.length).toBe(2);
				expect(b1.songs.data[1].resource.promoters.data.length).toBe(4);
			});
		});

		it('should have paged data after the response', function() {
			var done;
			runs(function() {
				done = false;
				GC.topsongs.$getPage(function() {
					done = true;
				});
			});
			waitsFor(function() { return done; }, 'server response', _asyncLongTimeout);
			runs(function() {
				expect(GC.topsongs.data.length).toBe(5);
			});
		});

		it('should have paged data after the response', function() {
			var done;
			runs(function() {
				done = false;
				GC.topsongs.$getPage(function() {
					done = true;
				});
			});
			waitsFor(function() { return done; }, 'server response', _asyncLongTimeout);
			runs(function() {
				expect(GC.topsongs.data.length).toBe(10);

				// all id's should be unique
				var uniqueIds = true;
				var ids = {};
				for(var i in GC.topsongs.data) {
					if(ids[GC.topsongs.data[i].id]) {
						uniqueIds = false;
						break;
					}
					ids[GC.topsongs.data[i].id] = true;
				}
				expect(uniqueIds).toBe(true);
			});
		});

		it('should convert response data to resource objects', function() {
			expect(GC.topsongs.data[3].$save).toBeDefined();
		});

	});

	describe('Creating an entity that has an "after" processing function attached', function() {

		var usr;
		var done = false;
		beforeEach(function() {
			runs(function() {
				usr = User.create({id:989898, name:'jim bob'}, function() {
					done = true;
				});
			});
		});

		it('should run the "after" processing function, which will add a new property after the user is created', function() {		
			waitsFor(function() { return done; }, 'server response', _asyncTimeout);
			runs(function() {
				expect(usr.newProp).toBe('new prop val');
			});
		});

		it('should return the user with the new property updated', function() {		
			var u;
			var gotUser = false;
			waitsFor(function() { return done; }, 'server response', _asyncTimeout);
			runs(function() {
				u = User.get(989898, function() {
					gotUser = true;
				});
			});
			waitsFor(function() { return gotUser; }, 'server response', _asyncTimeout);
			runs(function() {
				expect(u.newProp).toBe('new prop val');
			});
		});

	});

	describe('Creating an entity that has "before" processing attached', function() {

		var usr;
		var done = false;
		beforeEach(function() {
			runs(function() {
				usr = User.create({id:878787, name:'jannet dorado'}, function() {
					done = true;
				});
			});
		});

		it('should respond with a new property that was added by the processing function', function() {
			waitsFor(function() { return done; }, 'server response', _asyncTimeout);
			runs(function(){
				expect(usr.created).toBeDefined();
			});
		});

		it('should respond with a new property that was added by the processing function, when getting the entity again', function() {
			var u; var gotUser = false;
			waitsFor(function() { return done; }, 'server response', _asyncTimeout);
			runs(function(){
				u = User.get(878787, function() {
					gotUser = true;
				});
			});
			waitsFor(function() { return gotUser; }, 'server response', _asyncTimeout);
			runs(function() {
				expect(u.created).toBeDefined();
			});
		});

	});

}



