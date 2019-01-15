/* ===== Block Class ==============================
|  Class with a constructor for block 			   |
|  ===============================================*/

class Block {
	constructor(body){
		// Add your Block properties
		// Example: this.hash = "";
		this.height = '';
		this.timeStamp = '';
		this.body = body;
		this.previousHash = '0x';
		this.hash = '';
	}
}

module.exports.Block = Block;