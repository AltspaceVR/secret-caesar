/***************************************
* Main app - loads all main routes
***************************************/

const express = require('express');
const app = express();

app.use( express.static('static') );

app.listen(3000, () => {
	console.log('Listening on port 3000');
});
