"use strict";

const exec = require('child_process').exec;
const gulp = require('gulp');

const execute = (command, options) =>
	new Promise((resolve, reject) =>
		exec(command, options, (error, std_out) =>
			error ? reject(error) : resolve(std_out)
		)
	);

const executor = portal => command => execute(command, {cwd:`${process.cwd()}/../${portal}/`});

const gitAddSubmodules = query =>
	new Promise((resolve, reject) =>
		query('git submodule status')
			.then((std_out) => new Promise((resolve, reject) => {

				const regexp = /^[ +]*[0-9a-f]+ (.+) \(.+\)$/;

				let chain = Promise.resolve();

				std_out.split("\n")
					.forEach(line =>{

						if(line.search(regexp) !== -1){

							let path = regexp.exec(line)[1];
							chain = chain.then(() => query(`git add ${path}`));
						}
					});

				chain = chain.then(resolve).catch(reject);
			}))
			.then(resolve)
			.catch(reject)
	);

module.exports = portals => {

	gulp.task('update-portals', done => {

		let promises = portals.map(portal => {

			console.log(`Processing ${portal}`);
			const query = executor(portal);

			return query(`git pull --quiet`)
				.then(() => query(`git submodule init`))
				.then(() => query(`git submodule foreach 'git fetch'`))
				.then(() => query(`git submodule foreach 'git checkout develop --force'`))
				.then(() => query(`git submodule foreach 'git reset --hard origin/develop'`))
				.then(() => query(`git reset HEAD . --quiet`))
				.then(() => gitAddSubmodules(query))
				.then(() => query(`git commit -m "Updated submodules" --quiet`))
				.then(() => query(`git push --quiet`))
				.then(() => console.log(`Updated ${portal}`))
				.catch(() => console.log(`Nothing to update for ${portal}`));
		});

		Promise.all(promises).then(()=>done())
	});
};