import CascadingPromise from '../src/client/cascadingpromise';
describe("CascadingPromise", () => {
	const simpleCleanup = () => ((cleanupDone) => { cleanupDone(); }) ;
	const simpleResolve = () => ((resolve) => { resolve(); });
	const simpleReject = () => ((resolve, reject) => { reject(); });
	const noop = () => {};

	it("resolves when resolved", function(done) {
		let cascadingPromise = new CascadingPromise(
			null,
			simpleResolve(),
			simpleCleanup()
		).then(done);
	});

	it("resolves with a value", function(done) {
		let cascadingPromise = new CascadingPromise(
			null,
			(resolve, reject) => {
				resolve('foo');
			},
			simpleCleanup()
		).then((result) => {
			expect(result).toBe('foo');
			done();
		});
	});

	it("rejects when rejected", function(done) {
		let cascadingPromise = new CascadingPromise(
			null,
			simpleReject(),
			simpleCleanup()
		).catch(done);
	});

	it("rejects with error callback when rejected", function(done) {
		let cascadingPromise = new CascadingPromise(
			null,
			simpleReject(),
			simpleCleanup()
		).then(
			noop,
			done
		);
	});

	it("waits for prerequisites", function(done) {
		let finishedPrerequisite = false;
		new CascadingPromise(
			new Promise((resolve, reject) => {
				setTimeout(() => {
					finishedPrerequisite = true;
					resolve();
				}, 500);
			}),
			simpleResolve(),
			simpleCleanup()
		).then(() => {
			expect(finishedPrerequisite).toBe(true);
			done();
		});
	}, 1000);

	it("resolves when cancelled while waiting for prerequisites", function(done) {
		let execSpy = jasmine.createSpy();
		let cleanupSpy = jasmine.createSpy();
		let cascadingPromise = new CascadingPromise(
			new Promise((resolve, reject) => {
				setTimeout(resolve, 500);
			}),
			execSpy,
			cleanupSpy
		);
		cascadingPromise.then(() => {
			expect(execSpy.calls.count()).toBe(0);
			expect(cleanupSpy.calls.count()).toBe(0);
			done();
		});
		cascadingPromise.cancel();
	}, 1000);

	it("allows chaining", function(done) {
		new CascadingPromise(
			null,
			(resolve, reject) => {
				resolve('foo');
			},
			simpleCleanup()
		).then((result) => {
			return new CascadingPromise(
				null,
				(resolve, reject) => {
					resolve(result + 'bar');
				},
				(cleanupDone) => {  
					cleanupDone();
				}
			);
		}).then((finalResult) => {
			expect(finalResult).toBe('foobar');
			done();
		});
	});
});
