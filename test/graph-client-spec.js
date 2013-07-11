var _asyncTimeout = 1000;

describe('Setup with a root URL that doesn\'t have a trailing slash', function() {

	it('should set a root url without a trailing slash', function() {
		GC.setup({
			rootUrl: 'http://localhost:3000'
		});
		expect(GC.rootUrl).toBe('http://localhost:3000');
	});

});

describe('Setup with a root URL that has a trailing slash', function() {

	it('should set a root url without a trailing slash', function() {
		GC.setup({
			rootUrl: 'http://localhost:3000/'
		});
		expect(GC.rootUrl).toBe('http://localhost:3000');
	});

});
	
describe('Defining an endpoint named \'user\'', function() {

	beforeEach(function() {
		GC.setup({
			rootUrl: 'http://localhost:3000'
		});
		GC.define('user');
	});

	it('should create a User class', function() {
		expect(User).toBeDefined();
		expect(User.create).toBeDefined();
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

});

describe('Defining a band and a user endpoint, with a connection between them', function() {

	beforeEach(function() {
		GC.setup({
			rootUrl: 'http://localhost:3000'
		});
		GC.define('user');
		GC.define('band');
		GC.define('user.bands', 'band.members');
	});


	it('should create a Band and a User class', function() {
		expect(User).toBeDefined();
		expect(User.create).toBeDefined();
		expect(Band).toBeDefined();
		expect(Band.create).toBeDefined();
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

		});

	});

});