var _asyncTimeout = 5000;

describe('graph-client', function() {

	beforeEach(function() {
		GC.setup({
			rootUrl: 'http://localhost:3000'
		});
	});
	
	describe('Defining an endpoint named \'user\'', function() {

		beforeEach(function() {
			GC.define('user');
		});

		it('should create a User class', function() {
			expect(User).toBeDefined();
			expect(User.create).toBeDefined();
		});

	});

	describe('Calling User.create({name:\'mike\'})', function() {

		var user;

		beforeEach(function() {
			GC.define('user');
			runs(function() {
				user = User.create({name:'mike'});
			});
		});

		it('should return an instance of GraphClientResource, with name:\'mike\'', function() {
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

	});

});