/* ===== Persist data with LevelDB ==================
|  Learn more: level: https://github.com/Level/level |
/===================================================*/

const level = require('level');
const chainDB = './chaindata';

class LevelSandbox {

    constructor() {
        this.db = level(chainDB);
    }

    // Get data from levelDB with key (Promise)
    getLevelDBData(key){
        let self = this;
        return new Promise(function(resolve, reject) {
            // Add your code here, remember in Promises you need to resolve() or reject()
            self.db.get(key, function (err, value) {

                if (err) {
                    reject(err);
                } else {
                    resolve(value);
                }
            });
        });
    }

    // Add data to levelDB with key and value (Promise)
    addLevelDBData(key, value) {
        let self = this;
        return new Promise(function(resolve, reject) {
            // Add your code here, remember in Promises you need to resolve() or reject()
            self.db.put(key, value, function(err) {
                if (err) {
                    console.log('Block ' + key + ' submission failed', err);
                    reject(err);
                } else {
                    resolve(value);
                }
            })
        });
    }

    // Method that return the height
    getBlocksCount() {
        return this.getLevelDBData('count').then(count => {
            return parseInt(count);
        }).catch(error => {
            if (error.notFound) {
                return 0;
            }
        });
    }

    getBlockByHash(hash) {
        let self = this;
        let block = '';
        return new Promise(function(resolve, reject) {
            self.db.createValueStream()
                .on('data', function (data) {
                    console.log('data ? ' + data);
                    block = JSON.parse(data);
                    if (block instanceof Object) {
                        if (block.hash == hash) {
                            console.log('I found block.');
                            resolve(block);
                        }
                    }
                })
                .on('error', function (err) {
                    reject();
                })
                .on('end', function () {
                    if (block == '') {
                        console.log('not found block.');
                        let err = {};
                        err.notFound = true;
                        reject(err);
                    }
                })
        });

    }
        

}

module.exports.LevelSandbox = LevelSandbox;
