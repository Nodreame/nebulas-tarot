'use strict';
// 存储"抽牌结果"的数据结构
var DrawItem = function (text) {
  if (text) {
    var obj = JSON.parse(text);
    this.address    = obj.address;
    this.num        = obj.num;
    this.createdate = obj.createdate;
  }
};
DrawItem.prototype = {
  toString: function () {
    return JSON.stringify(this);
  }
};

// 访问自己智能合约的存储空间
var DrawContract = function () {
  //  add property to DrawContract
  LocalContractStorage.defineProperty(this, 'ownerAddress');     
  LocalContractStorage.defineProperty(this, 'drawTotal', {
    stringify: function (obj) {
      return obj.toString();
    },
    parse: function (str) {
      return new BigNumber(str);
    }
  });
  LocalContractStorage.defineMapProperty(this, 'arrayMap');
  // add map property to DrawContract
  LocalContractStorage.defineMapProperty(this, 'dataMap', {
    stringify: function (obj) {
      return obj.toString();
    },
    parse: function (str) {
      return new DrawItem(str);
    }
  });
};
DrawContract.prototype = {
  init: function () {         // run once when deploy smartContract
    this.ownerAddress = Blockchain.transaction.from;    // save my address
    this.drawTotal = new BigNumber(0);                  // record the count of drawing successfully
  },
  // func
  _isOwner: function () {
    return this.ownerAddress === Blockchain.transaction.from;
  },
  setOwner: function () {
    if (!this._isOwner()) {
      throw new Error('Method is only available to the owner');
    }
    this.ownerAddress = Blockchain.transaction.from
    return this.ownerAddress;
  },
  getOwner: function () {
    return this.ownerAddress;
  },
  withdraw: function (address, value) {     // withdraw NAS from contract to address
    if (!this._isOwner()) {
      throw new Error('Method is only available to the owner');
    }
    if (!this.verifyAddress(address)) {
      throw new Error('Invaild address');
    }
    if (typeof(value) === 'number') {
      throw new Error('Value type isn\'t number: ', typeof(value));
    }
    Blockchain.transfer(address, new BigNumber(value));
    console.log("transfer result:", result);  
    Event.Trigger("transfer", {
      Transfer: {
          from: Blockchain.transaction.to,
          to: address,
          value: value
      }
    });
    return result;
  },
  transfer: function (address, value) {
    var result = Blockchain.transfer(address, value);
    console.log("transfer result:", result);
    Event.Trigger("transfer", {
        Transfer: {
            from: Blockchain.transaction.to,
            to: address,
            value: value
        }
    });
  },
  save: function (num, createdate) {
    if (!num || !createdate) {
      throw new Error('empty num or content')
    }
    if (typeof(num)!=='number' || typeof(createdate)!=='number') {
      throw new Error('num or createdate is not a number');
    }
    var from = Blockchain.transaction.from;
    if (!from) {
      throw new Error('Empty address');
    }
    var drawItem = new DrawItem();
    drawItem.address    = from;
    drawItem.num        = num;
    drawItem.createdate = createdate;
    console.log('drawItem:', drawItem);
    var dataKey = from + Date.now().toString();
    this.arrayMap.put(parseInt(this.drawTotal), dataKey); // 有没有可能出现覆盖呢
    this.dataMap.put(dataKey, drawItem);
    this.drawTotal = this.drawTotal.plus(new BigNumber(1));
    return JSON.stringify(drawItem);
  },
  getData: function () {
    var from = Blockchain.transaction.from;
    if (!from) {
      throw new Error('Empty address');
    }
    if (!this.verifyAddress(from)) {
      throw new Error('Invaild address');
    }
    var resultList = [];
    var totalCount = parseInt(this.drawTotal);
    if (totalCount > 0) {
      for (var i=totalCount-1; i>=0; i--) {
        var datakey = this.arrayMap.get(i);
        if (datakey.indexOf(from) !== -1) {
          var obj = this.dataMap.get(datakey);
          if (obj && obj['address'] === from) {
            resultList.push(obj);
          }
        }
      }
    }
    return resultList;
  },
  getDrawTotal: function () {
    return parseInt(this.drawTotal);
  },
  // common
  verifyAddress: function (address) {
    return Blockchain.verifyAddress(address)===0? false: true;
  },
  transaction: function (address, value) {
    // TODO: user -> contract
  }
};
module.exports = DrawContract;