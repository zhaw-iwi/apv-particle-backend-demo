const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const axios = require('axios');
const bodyParser = require('body-parser');

const app = express();
app.use(cors())
app.use(bodyParser.json()); // support json encoded bodies
app.use('/', express.static(path.join(__dirname, 'dist')));

const port = process.env.PORT || '3001';
app.set('port', port);

const server = http.createServer(app);

var config = {}
try {
    config = require('./config')
} catch (error) {
    console.log("Module 'config' not found, trying Heroku config vars.")
}

const devices = [
    // device 0 
    {
        device_id: process.env.DEVICE_ID_1 || config.DEVICE_ID_1,
        access_token: process.env.ACCESS_TOKEN_1 || config.ACCESS_TOKEN_1
    },
    // device 1
    //{
    //    device_id: process.env.DEVICE_ID_2 || config.DEVICE_ID_2,
    //    access_token: process.env.ACCESS_TOKEN_2 || config.ACCESS_TOKEN_2
    //}
    // more devices ...
]

// Read a variable. Example:
// GET /api/device/0/variable/buttonState
app.get('/api/device/:id/variable/:name', async (req, res) => {
    var id = req.params.id;
    var variableName = req.params.name;

    if (id >= devices.length) {
        res.status(500).send({ error: "invalid device id" });
    }
    else {
        var device = devices[id];
        var url = 'https://api.particle.io/v1/devices/' + device.device_id + '/' + variableName + '?access_token=' + device.access_token;

        try {
            var response = await axios.get(url);
            res.send({
                last_heard: response.data.coreInfo.last_heard,
                result: response.data.result,
            });

        } catch (error) {
            res.status(500).send({ error: "could not read variable " + variableName });
        }
    }
})

// Call a function. Example:
// POST /api/device/0/function/blinkRed
app.post('/api/device/:id/function/:name', async (req, res) => {

    var id = req.params.id;
    var functionName = req.params.name;

    if (id >= devices.length) {
        res.status(500).send({ error: "invalid device id" });
    }
    else {
        var device = devices[id];
        var data = { arg: req.body.arg };

        var url = 'https://api.particle.io/v1/devices/' + device.device_id + '/' + functionName + '?access_token=' + device.access_token;

        try {
            var response = await axios.post(url, data);
            res.send({ result: response.data.return_value })
        } catch (error) {
            res.status(500).send({ error: "could not execute function " + functionName })
        }
    }
})


// Read a variable on all devices. Example:
// GET /api/variable/buttonState
app.get('/api/variable/:name', async (req, res) => {

    var variableName = req.params.name;

    // array to store the values of the variable
    var values = [];

    try {
        for (var device of devices) {
            var url = 'https://api.particle.io/v1/devices/' + device.device_id + '/' + variableName + '?access_token=' + device.access_token;

            var response = await axios.get(url);
            values.push({
                device_Id: device.device_id,
                value: response.data.result
            })

        }

        res.send(values);

    } catch (error) {
        res.status(500).send({ error: "could not read current value" });
    }

})


server.listen(port, () => {
    console.log("app listening on port " + port);
});
