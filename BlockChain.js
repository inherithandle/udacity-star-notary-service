/* ===== Blockchain Class ==========================
|  Class with a constructor for new blockchain 		|
|  ================================================*/

const SHA256 = require('crypto-js/sha256');
const LevelSandbox = require('./LevelSandbox.js');
const Block = require('./Block.js');

class Blockchain {

    constructor() {
        this.bd = new LevelSandbox.LevelSandbox();
        this.generateGenesisBlock();
    }

    // Helper method to create a Genesis Block (always with height= 0)
    // You have to options, because the method will always execute when you create your blockchain
    // you will need to set this up statically or instead you can verify if the height !== 0 then you
    // will not create the genesis block
    generateGenesisBlock(){
        // Add your code here
        let self = this;
        let genesisBlock = new Block.Block('this is the genesis block.');

        this.isEmptyChain().then(isEmpty => {
            if (isEmpty) {
                genesisBlock.timeStamp = new Date().getTime().toString().slice(0,-3);
                genesisBlock.height = 0;
                genesisBlock.hash = SHA256(JSON.stringify(genesisBlock)).toString();
                self.bd.addLevelDBData(genesisBlock.height, JSON.stringify(genesisBlock)).then(() => {
                    self.bd.addLevelDBData('count', 1);
                })
            }
        });
    }

    isEmptyChain() {
        return this.bd.getBlocksCount().then(count => {
            return count == 0;
        });
    }

    // Get block height, it is a helper method that return the height of the blockchain
    getBlockHeight() {
        // Add your code here
        return this.bd.getBlocksCount().then(count => {
            return count - 1;
        });
    }

    // Add new block
    addBlock(block) {
        let self = this;
        block.timeStamp = new Date().getTime().toString().slice(0,-3);
        return this.bd.getBlocksCount().then(count => {
            block.height = count;
            return block;
        }).then(block => {
            return self.bd.addLevelDBData('count', block.height + 1);
        }).then((value) => {
            let promise = self._getPreviousBlock(block.height).then(previousBlock => {
                let previousBlockObj = JSON.parse(previousBlock);
                block.previousHash = previousBlockObj.hash;
                block.hash = SHA256(JSON.stringify(block)).toString();
                return self.bd.addLevelDBData(block.height, JSON.stringify(block));
            });
            return promise;

        });
    }

    _getPreviousBlock(height) {
        let self = this;
        return new Promise(function(resolve, reject) {
            self.bd.getLevelDBData(height - 1).then(previousBlock => {
                resolve(previousBlock);
            }).catch(error => {
                if (error.notFound) {
                    console.log('not found!');
                }
                reject(error);
            })
        });

        // return this.getBlock(this.count - 1);
    }

    // Get Block By Height
    getBlock(height) {
        // Add your code here
        let self = this;
        return new Promise(function(resolve, reject) {
            self.bd.getLevelDBData(height).then(block => {
                resolve(JSON.parse(block));
            }).catch(error => {
                if (error.notFound) {
                    console.log('not found!');
                }
                reject(error);
            })
        });
    }

    // Validate if Block is being tampered by Block Height
    validateBlock(height) {
        // Add your code here
        return this.getBlock(height).then(block => {
            let persistentBlockHash = block.hash;
            block.hash = '';
            return persistentBlockHash == SHA256(JSON.stringify(block)).toString();
        });
    }

    // Validate Blockchain
    validateChain() {
        // Add your code here
        let self = this;
        let promises = [];
        return this.getBlockHeight().then(count => {
            for (let i = 0; i <= count; i++) {
                let promise = self.validateBlock(i);
                promises.push(promise);
            }

            let promise = Promise.all(promises).then(values => {
                let invalidBlocks = [];
                for (let i = 0; i < values.length; i++) {
                    if (values[i] == false) {
                        invalidBlocks.push(i);
                    }
                }
                return invalidBlocks;
            })

            return promise;
        });

    }

    // Utility Method to Tamper a Block for Test Validation
    // This method is for testing purpose
    _modifyBlock(height, block) {
        let self = this;
        return new Promise( (resolve, reject) => {
            self.bd.addLevelDBData(height, JSON.stringify(block).toString()).then((blockModified) => {
                resolve(blockModified);
            }).catch((err) => { console.log(err); reject(err)});
        });
    }
   
}

module.exports.Blockchain = Blockchain;
