const BlockClass = require('./Block.js');
const bitcoinMessage = require('bitcoinjs-message');
const hex2ascii = require('hex2ascii')
const BlockChain = require('./BlockChain.js');

let myBlockChain = new BlockChain.Blockchain();
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
        this.requestObject();
        this.addBlock();
        this.getBlockByHeight();
        this.getBlockByHash();
        this.getBlocksByWalletAddress();
    }

    requestValidation() {
        let self = this;
        this.app.post("/requestValidation", (req, res) => {
            if (self.memPool[req.body.address] instanceof Object) {
                let timeElapse = (new Date().getTime().toString().slice(0,-3)) - self.memPool[req.body.address].requestTimeStamp;
                let timeLeft = 300 - timeElapse;
                self.memPool[req.body.address].validationWindow = timeLeft;
            } else {
                self.memPool[req.body.address] = {};
                self.memPool[req.body.address].walletAddress = req.body.address;
                self.memPool[req.body.address].validationWindow = 300;
                self.memPool[req.body.address].requestTimeStamp = new Date().getTime().toString().slice(0,-3);
                self.memPool[req.body.address].message = `${self.memPool[req.body.address].walletAddress}:${self.memPool[req.body.address].requestTimeStamp}:starRegistry`;
                self.timeoutRequests[req.body.address] = setTimeout( function() {
                    console.log(`the request from ${req.body.address} is timed out!`);
                    self.memPool[req.body.address] = undefined;
                }, 300 * 1000 );
            }
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

    addBlock() {
        let self = this;
        this.app.post("/block", (req, res) => {
            var responseBody = {};
            // undefined 유닛 테스트?
            if (self.memPool[req.body.address] === undefined) {
                responseBody.error = 'First you have to consume /requestValidation';
                res.status(200).send(responseBody);
            } else if (!self.memPool[req.body.address].messageSignature) {
                responseBody.error = 'you have to validate your request with your signature.';
                res.status(200).send(responseBody);
            } else {
                let block = {};
                block.body = {};
                block.body.address = req.body.address;
                block.body.star = {};
                block.body.star.dec = req.body.star.dec;
                block.body.star.ra = req.body.star.ra;
                block.body.star.story = Buffer(req.body.star.story).toString('hex');

                myBlockChain.addBlock(block).then(() => {
                    self.memPool[req.body.address] = undefined;
                    res.status(200).send(block);
                });
            }

        });
    }

    getBlockByHeight() {
        this.app.get("/block/:height", (req, res) => {
            myBlockChain.getBlock(req.params.height).then((block) => {
                block.body.star.storyDecoded = hex2ascii(block.body.star.story);
                res.status(200).send(block);
            }).catch(() => {
                let body = {};
                body.error = "the block not found.";
                res.status(200).send(body);
            })
        });

    }

    getBlockByHash() {
        this.app.get("/stars/hash\::hash", (req, res) => {
            myBlockChain.getBlockByHash(req.params.hash).then(block => {
                if (block instanceof Object) {
                    block.body.star.storyDecoded = hex2ascii(block.body.star.story);
                    res.status(200).send(block);
                } else {
                    let error = {};
                    error.error = "block not found";
                    res.status(200).send(error);
                }
            })
        });
    }

    getBlocksByWalletAddress() {
        this.app.get("/stars/address\::address", (req, res) => {
            myBlockChain.getBlocksByWalletAddress(req.params.address).then(blocks => {
                blocks.forEach(block => {
                    block.body.star.storyDecoded = hex2ascii(block.body.star.story);
                });
                res.status(200).send(blocks);
            })
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