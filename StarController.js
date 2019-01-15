const SHA256 = require('crypto-js/sha256');
const BlockClass = require('./Block.js');
const bitcoinMessage = require('bitcoinjs-message')

/**
 * Controller Definition to encapsulate routes to work with blocks
 */
class StarController {

    /**
     * Constructor to create a new StarController, you need to initialize here all your endpoints
     * @param {*} app 
     */
    constructor(app) {
        this.app = app;
        this.blocks = [];
        this.memPool = [];
        this.timeoutRequests = {};
        this.requestValidation();
        this.getBlockByIndex();
        this.requestObject();
    }

    /**
     * Implement a GET Endpoint to retrieve a block by index, url: "/api/block/:index"
     */
    getBlockByIndex() {
        let self = this;
        this.app.get("/api/block/:index", (req, res) => {
            let data = {};
            if (req.params.index < 0 || req.params.index >= self.blocks.length) {
                console.log('error');
                data['error'] = 'index out of bound';
            } else {
                data = self.blocks[req.params.index];
            }
            res.status(200).send(data);

        });
    }

    requestValidation() {
        let self = this;
        this.app.post("/requestValidation", (req, res) => {
            self.memPool[req.body.address] = {};
            self.memPool[req.body.address].walletAddress = req.body.address;
            self.memPool[req.body.address].validationWindow = 300;
            self.memPool[req.body.address].requestTimeStamp = new Date().getTime().toString().slice(0,-3);
            self.memPool[req.body.address].message = `${self.memPool[req.body.address].walletAddress}:${self.memPool[req.body.address].requestTimeStamp}:starRegistry`;
            self.timeoutRequests[req.body.address] = setTimeout( function() {
                console.log(`the request from ${req.body.address} is timed out!`);
                self.memPool[req.body.address] = undefined;
            }, 300 * 1000 );
            res.status(200).send(self.memPool[req.body.address]);
        });
    }

    requestObject() {
        let self = this;
        this.app.post("/message-signature/validate", (req, res) => {
            let responseBody = {};
            if (self.isThisRequestisComingin5Minutes(req.body.address)) {
                console.log('signature is : ' + req.body.signature);
                if (bitcoinMessage.verify(self.memPool[req.body.address].message, req.body.address, req.body.signature)) {
                    responseBody.registerStar = true;
                    responseBody.status = {};
                    responseBody.status.address = req.body.address;
                    responseBody.status.requestTimeStamp = new Date().getTime().toString().slice(0,-3);
                    responseBody.status.messqage = self.memPool[req.body.address].message;
                    let timeElapse = (new Date().getTime().toString().slice(0,-3)) - self.memPool[req.body.address].requestTimeStamp;
                    let timeLeft = 300 - timeElapse;
                    responseBody.status.validationWindow = timeLeft;
                    responseBody.status.messageSignature = true;
                    self.memPool[req.body.address].messageSignature = true;

                    self.timeoutRequests[req.body.address] = undefined;
                } else {
                    responseBody.error = 'signature is invalid';
                }
            } else {
                responseBody.error = 'your request is not found or your request is timed out';
            }

            res.status(200).send(responseBody);
        });
    }

    isThisRequestisComingin5Minutes(address) {
        return this.timeoutRequests[address] instanceof Object;
    }

    /**
     * Implement a POST Endpoint to add a new Block, url: "/api/block"
     */
    requestValidationpostNewBlock() {
        // curl -d '{"hash":"49cce61ec3e6ae664514d5fa5722d86069cf981318fc303750ce66032d0acff3","height":0,"body":"First block in the chain - Genesis block","time":"1530311457","previousBlockHash":""}'  -H "Content-Type: application/json" -X POST http://localhost:8000/api/block
        let self = this;
        this.app.post("/api/block", (req, res) => {
            let newBlock = new BlockClass.Block(req.body.body);
            newBlock.hash = req.body.hash;
            newBlock.height = self.blocks.length;
            newBlock.previousBlockHash = this.blocks[this.blocks.length - 1].hash;
            newBlock.time = new Date().getTime().toString().slice(0,-3);
            self.blocks.push(newBlock);

            res.status(200).send(newBlock);
        });
    }

}

/**
 * Exporting the StarController class
 * @param {*} app 
 */
module.exports = (app) => { return new StarController(app);}