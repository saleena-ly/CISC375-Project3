var fs = require('fs');
var path = require('path');
var express = require('express');
var sqlite3 = require('sqlite3');
var json2xml = require('js2xmlparser');
var bodyParser = require('body-parser');
var cors = require('cors');
var port = process.argv[2];
var db_filename = path.join(__dirname, 'db', 'stpaul_crime.sqlite3');

var app = express();
app.use(bodyParser.urlencoded({extended: true})); //takes uploaded data and changes it from random string values to actual keys and values
app.use(cors());


var db = new sqlite3.Database(db_filename, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.log('Error opening ' + db_filename);
    }
    else {
        console.log('Now connected to ' + db_filename);
    }
});

app.get('/codes', (req, res) => {
	var codes = {};
	console.log(req.query.code);
	if(req.query.code != null)
	{
		var codeReq = req.query.code.split(",");
	}
	var format = req.query.format;


	db.all('SELECT * FROM Codes', (err, rows) => {
		rows.forEach(incident => {
			if(req.query.code == null || codeReq[0] == '')
			{
				let key = "C" + incident.code;
				codes[key] = incident.incident_type;
			}
			else
			{
				for(let i = 0; i < codeReq.length; i++)
				{
					if(incident.code == codeReq[i])
					{
						let key = "C" + incident.code;
						codes[key] = incident.incident_type;
					}
				}
			}
		});

		if(req.query.format == "xml")
		{
			codes = json2xml.parse("codes", codes);
			res.type('xml').send(codes);
		}
		else
		{
			res.type('json').send(codes);
		}
	});
});

app.get('/neighborhoods', (req, res) => {
	var neighborhoods = {};
	console.log(req.query.id);
	if(req.query.id != null)
	{
		var idReq = req.query.id.split(",");
	}
	var format = req.query.format;


	db.all('SELECT * FROM Neighborhoods', (err, rows) => {
		if(err)
		{
			WriteCustom404Error(res, `no data for neighborhoods`);
		}
		rows.forEach(neighborhood => {
			if(req.query.id == null || idReq[0] == '')
			{
				let key = "N" + neighborhood.neighborhood_number;
				neighborhoods[key] = neighborhood.neighborhood_name;
			}
			else
			{
				for(let i = 0; i < idReq.length; i++)
				{
					if(neighborhood.neighborhood_number == idReq[i])
					{
						let key = "C" + neighborhood.neighborhood_number;
						neighborhoods[key] = neighborhood.neighborhood_name;
					}
				}
			}
		});

		if(req.query.format == "xml")
		{
			neighborhoods = json2xml.parse("neighborhoodIds", neighborhoods);
			res.type('xml').send(neighborhoods);
		}
		else
		{
			res.type('json').send(neighborhoods);
		}
	});
});

app.get('/incidents', (req, res) => {
	var incidents = {};
	var query = "";
	var first = true;

	if(req.query.start_date != null && req.query.start_date!=''){
		query = query + ' date_time>=' + "'" + req.query.start_date + 'T00:00:00' + "'";
		first = false;
	}
	if(req.query.end_date != null && req.query.end_date!=''){
		if(first == true){
			query = query + ' date_time<=' + "'" + req.query.end_date + 'T23:59:59' + "'";
			first = false;
		}
		else{
			query = query + ' AND date_time<=' + "'" + req.query.end_date + 'T23:59:59' + "'";
		}
	}
	if(req.query.code != null && req.query.code!=''){
		var codeReq = req.query.code.split(",");
		if(first == true){
			query = query + ' (code=' + codeReq[0];
			for(let i = 1; i < codeReq.length; i++){
				query = query + ' OR code=' + codeReq[i];
			}

			first = false;
		}
		else{
			query = query + ' AND (code=' + codeReq[0];
			for(let i = 1; i < codeReq.length; i++){
				query = query + ' OR code=' + codeReq[i];
			}
		}
		query = query + ')';
	}
	if(req.query.grid != null && req.query.grid!=''){
		var gridReq = req.query.grid.split(",");
		if(first == true){
			query = query + ' (police_grid=' + gridReq[0];
			for(let i = 1; i < gridReq.length; i++){
				query = query + ' OR police_grid=' + gridReq[i];
			}

			first = false;
		}
		else{
			query = query + ' AND (police_grid=' + gridReq[0];
			for(let i = 1; i < gridReq.length; i++){
				query = query + ' OR police_grid=' + gridReq[i];
			}
		}
		query = query + ')';
	}
	if(req.query.id != null && req.query.id!=''){
		var idReq = req.query.id.split(",");
		if(first == true){
			query = query + ' (neighborhood_number=' + idReq[0];
			for(let i = 1; i < idReq.length; i++){
				query = query + ' OR neighborhood_number=' + idReq[i];
			}

			first = false;
		}
		else{
			query = query + ' AND (neighborhood_number=' + idReq[0];
			for(let i = 1; i < idReq.length; i++){
				query = query + ' OR neighborhood_number=' + idReq[i];
			}
		}
		query = query + ')';
	}
	if(req.query.limit != null && req.query.limit!=''){
		var limit = req.query.limit;
	}
	else{
		var limit = 10000;
	}

	db.all('SELECT * FROM Incidents WHERE' + query + ' ORDER BY date_time LIMIT ' + limit, (err, rows) => {
		rows.forEach(incident => {
			let key = "I" + incident.case_number;
			let dateTime = incident.date_time.split("T");
			let date = dateTime[0];
			let time = dateTime[1];
			if(time.includes("."));
			{
				time = time.substring(0, time.indexOf("."));
			}
			incidents[key] = {
				"date" : date,
				"time" : time,
				"code" : incident.code,
				"incident" : incident.incident,
				"police_grid" : incident.police_grid,
				"neighborhood_number" : incident.neighborhood_number,
				"block" : incident.block
			}
		});
		if(req.query.format == "xml")
		{
			incidents = json2xml.parse("incidents", incidents);
			res.type('xml').send(incidents);
		}
		else
		{
			res.type('json').send(incidents);
		}
	});
});

app.put('/new-incident', (req, res) => {
	let dateTime = req.body.date + "T" + req.body.time;
	let things = [req.body.case_number, dateTime, req.body.code, req.body.incident, req.body.police_grid, req.body.neighborhood_number, req.body.block];
	let placeholders = things.map((things) => '(?)').join(',');
	let sql = 'INSERT INTO Incidents(case_number, date_time, code, incident, police_grid, neighborhood_number, block) VALUES ' + placeholders;

	db.run(sql, things,(err) => {
		if(err)
		{
			res.status(500).send(err.message);
		}
	});
});

let WriteCustom404Error = (res, reason) => {
    res.writeHead(404, { 'Content-Type': 'text/html' });
    //read the 404 template and insert the custom reason
    ReadFile(path.join(template_dir, '404.html'))
        .then(template => {
            template = template.replace('<p class ="error-reason">page not found</p>',
                `<p class ="error-reason">${reason}</p>`);

            res.write(template);
            res.end();
        })
        .catch(err => { console.log(err); });
}

app.listen(port);
console.log("listening to port " + port + "...");
