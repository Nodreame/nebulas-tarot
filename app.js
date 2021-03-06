// init var
var title         = $('#title');
var page_guide    = $('#page_guide');
var page_loading  = $('#page_loading');
var page_result   = $('#page_result');
// var page_wallet   = $('#page_wallet');
var btn_drawtarot = $('#btn_drawtarot');
var tx_loading    = $('#tx_loading');
var tx_name       = $('#tx_name');
var tx_direction  = $('#tx_direction');
var tx_result_desc= $('#tx_result_desc');
var img_result    = $('#img_result');

var _g        = {};
_g.contract   = {};
_g.state      = {};
_g.draw       = {};
_g.wallet     = {};
_g.transaction= {};
// contract
_g.contract.mainnetUrl = 'https://mainnet.nebulas.io';
_g.contract.testnetUrl = 'https://testnet.nebulas.io';
_g.contract.address = _g.state.isDebugging? 'n1vTNx5Q2hx8KALF1NFTxu7KMh5LWEsVRPo': 'n1g5eFS5Egx3Nykigv6uAEaczDgXunirz29';    
// state
_g.state.isDebugging= false;        // use to sign now is main/test
_g.state.isChanging = false;        // use to prevent switch module to fast
_g.state.changeTime = 1000;
_g.state.isHistoryLoading = false;
// _g.state.nowModule  = 'content';
// draw
_g.draw.imgUrlPrefix= 'assert/img/MajorArcana/';
_g.draw.num         = -1;     // num of draw
_g.draw.maxnum      = 43;     // tarotsNum, it may change when use different tarot mode
_g.draw.total       = 0;      // total times of user draw
_g.draw.tarotList   = [];     // all data of tarot (hardcode in data/data.json)
_g.draw.allData     = [];     // all records of you
_g.draw.historyData = [];     // all records for show (just use allData is ok but this is faster)
// wallet
_g.wallet.address     = '';   // address read from wallet/walletExtension
_g.wallet.balance     = -1;   // balance read from wallet/walletExtension
_g.wallet.type        = 87;   // 0-illegality, 87-user wallet, 88-contract wallet
_g.wallet.plugInExist = false;// if walletExtension exist
// transaction

var nebulas = require('nebulas');
var Account = nebulas.Account;
var Neb = new nebulas.Neb();
Neb.setRequest(new nebulas.HttpRequest(_g.state.isDebugging? _g.contract.testnetUrl: _g.contract.mainnetUrl));
var NebPay = require('nebpay');
var nebPay = new NebPay();
// console.log('nebulas:', nebulas);
// console.log('Account:', Account);
// console.log('Neb:', Neb);
// console.log('NebPay:', NebPay);
// console.log('nebPay:', nebPay);

/*** wallet method ***/
// detect webExtensionWallet (TODO: prepare for mobile app)
function detectWallet () {
  _g.wallet.plugInExist = typeof(webExtensionWallet) !== 'undefined'? true: false;
  if (!_g.wallet.plugInExist) {
    console.error('wallet no exist');
  }
}
 
/*** chain method ***/
function save (callback, num) {
  var listenCount = 0;
  var hashCount   = 0;

  var to        = _g.contract.address;
  var value     = '0';
  var callFunc  = 'save';
  var callArgs  = JSON.stringify([num, Date.now()]);
  var options   = {
    goods: {
      name: "tarot result"
    },
    callback: _g.state.isDebugging? NebPay.config.testnetUrl: NebPay.config.mainnetUrl,
    // listener: cbStart
  };
  var hashListener = function (txhash) {
    if (hashCount < 8) {
      Neb.api.getTransactionReceipt({
        hash: txhash
      }).then (function (response) { // status: 2(pending) 1(success)
        console.log('response:', response); 
        if (response.status === 1) {
          console.log('write to NEBULAS success!');
          alert('塔罗记录写入星云链成功!');
          // callback.call(this, num);       // show Result
          getData();
        } else {
          hashCount++;
          setTimeout(() => {
            hashListener(txhash);
          }, 5000);
        }
      });
    } else {
      console.log('write to NEBULAS timeout');
      alert('timeout');
    }
  }
  var serialNum = nebPay.call(to, value, callFunc, callArgs, options);
  console.log('serialNum:', serialNum);
  /*** can't get success callback ***/
  var intervalQuery = setInterval(function() {
    nebPay.queryPayInfo(serialNum, options)
      .then(function (dataStr) {
        if (listenCount < 8) {
          var data = JSON.parse(dataStr);
          console.log('data:', data);
          if (data.code === 0) {    // data.code为0即serialNum已确认，可以换hash继续查或者继续等待data.data.status为1
            if (data.data.status === 1) {
              callback.call(this, num);
              getData();
              clearInterval(intervalQuery);
            } else {
              console.log('get transaction txhash， show tarot and wait for writing to NEBULAS by txhash.');
              tx_loading.text('抽牌成功！正在将塔罗结果写入星云链！');
              setTimeout(function () {
                callback.call(this, num);
                clearInterval(intervalQuery);
                console.log('data.data:', data.data);
                hashListener(data.data.hash);
                // tx_loading.text('正在抽牌');    // reset
              }, 2000);
            }
          } else {
            console.log("data.msg.indexOf('does not exist')", data.msg.indexOf('does not exist'));
            console.log('listenCount:', listenCount);
            if (data.msg.indexOf('does not exist') !== -1 && listenCount>4) {
              console.log('can\'t recognize state of transaction, so go to guide page.');
              tx_loading.text('抽牌确认超时，五秒后返回抽牌引导界面');
              setTimeout(function () {
                initContent('guide');
                clearInterval(intervalQuery);
                // tx_loading.text('正在抽牌');    // reset
              }, 5000);
            }
          }
          listenCount++;
        } else {
          console.log('网络连接超时, 五秒后自动刷新网页');
          clearInterval(intervalQuery);
          setTimeout(function () {
            window.location.reload(); 
          }, 5000);
        }
      })
      .catch(function (error) {
        console.error(error);
      });
  }, 10000);
}
// get user data by transation
function getUserData (isJump2Draw) {
  var listenCount = 0;
  var hashCount = 0;
  var to        = _g.contract.address;
  var value     = '0';
  var callFunc  = 'getData';
  var callArgs  = JSON.stringify([]);
  var options   = {
    goods: {
      name: "get user data"
    },
    callback: _g.state.isDebugging? NebPay.config.testnetUrl: NebPay.config.mainnetUrl,
    // listener: cbStart
  };
  var hashListener = function (txhash) {
    if (hashCount < 8) {
      Neb.api.getTransactionReceipt({
        hash: txhash
      }).then (function (response) { // status: 2(pending) 1(success)
        console.log('response:', response); 
        if (response.status === 1) {
          console.log('getData success!');
          getData();
        } else {
          hashCount++;
          setTimeout(() => {
            hashListener(txhash);
          }, 5000);
        }
      });
    } else {
      console.log('write to NEBULAS timeout');
      alert('timeout');
    }
  }
  var serialNum = nebPay.call(to, value, callFunc, callArgs, options);
  var intervalQuery = setInterval(function() {
    nebPay.queryPayInfo(serialNum, options)
      .then(function (dataStr) {
        if (listenCount < 8) {
          var data = JSON.parse(dataStr);
          console.log('data:', data);
          if (data.code === 0) {    // data.code为0即serialNum已确认，可以换hash继续查或者继续等待data.data.status为1
            console.log('get transaction txhash， show tarot and wait for writing to NEBULAS by txhash.');
            setTimeout(function () {
              clearInterval(intervalQuery);
              console.log('data.data:', data.data);
              console.log('地址获取成功data.data.from:', data.data.from);
              _g.wallet.address = data.data.from;
              if (isJump2Draw) {
                // jump to draw
                initContent(decideContentPage());
                // TODO2: history show loading
                // loadingTableData();
                _g.state.isHistoryLoading = true;
                $('#instruction_loading').hide();
              }
              hashListener(data.data.hash);
            }, 2000);
          } 
          listenCount++;
        } else {
          console.error('can\'t recognize state of transaction, so go to guide page.');
          clearInterval(intervalQuery);
        }
      })
      .catch(function (error) {
        console.error(error);
      });
  }, 10000);
}
// get datalist by address
function getData () {
  if (Neb.api) {
    Neb.api.call({
      from: _g.wallet.address,
      to:   _g.contract.address,
      value: 0,
      contract: {
        function: 'getData',
        args: '[]'
      },
      gasPrice: 1000000,
      gasLimit: 2000000
    }).then(function (data) {
      console.log('data', data);
      _g.draw.allData = JSON.parse(data.result);
      getTodayState();
      getHistoryData();
      return JSON.parse(data.result);
    });
  }
  // 移动端无效
  // if (nebPay) {
  //   nebPay.simulateCall(_g.contract.address, 0, 'getData', '[]', {
  //     listener: function (data) {
  //       console.log('data:', data);
  //       _g.draw.allData = JSON.parse(data.result);
  //       getTodayState();
  //       getHistoryData();
  //       return JSON.parse(data.result);
  //     }
  //   });
  // }
}
// get total count
function getDrawTotal () {
  if (Neb.api) {
    Neb.api.call({
      from: _g.wallet.address,
      to:   _g.contract.address,
      value: 0,
      contract: {
        function: 'getDrawTotal',
        args: '[]'
      },
      gasPrice: 1000000,
      gasLimit: 2000000
    }).then(function (data) {
      console.log('getDrawTotal:', data);
      _g.draw.total = parseInt(data.result);
      $('#tx_total').html('');
      $('#tx_total').html('应用现已成功抽取<span class="text-wheat">'+_g.draw.total+'</span>次塔罗牌.');
      return parseInt(data.result);
    });
  }
}
// withdraw nas from contract
function withDraw (address, value) {
  if (Neb.api) {
    Neb.api.call({
      from: _g.wallet.address,
      to:   _g.contract.address,
      value: 0,
      contract: {
        function: 'withdraw',
        args: JSON.stringify([address, value])
      },
      gasPrice: 1000000,
      gasLimit: 2000000
    }).then(function (data) {
      console.log('withdraw:', data);
    }, function (error) {
      console.error('withdraw error:', error);
    });
  }
} 

/*** common method ***/
function getTarotList () {
  $.ajax({
    type: 'GET',
    dataType: 'json',
    url: 'data/data.json',
    success: function(result) {
      // console.log('tarotList:', result);
      _g.draw.tarotList = result;
      return result;
    }
    // TODO: if fail
  });
}
// get a tarot obj
function getTarot(num) {
  // console.log('num:', num);
  var tarot = {};
  var halfNum = (_g.draw.maxnum + 1)/2;
  var tarotNum = -1;
  // get tarotNum
  if (num) {
    tarotNum = num? num: -1;
  } else if (_g.draw.num < 0) {
    _g.draw.num = drawTarotNum();
    tarotNum = _g.draw.num;
  } else {
    tarotNum = _g.draw.num;
  }
  if (tarotNum >= halfNum) {
    tarot.direction = false;
    tarotNum -= halfNum;
  } else {
    tarot.direction = true;
  }
  // console.log('tarotNum:', tarotNum);
  tarot.name   = _g.draw.tarotList[tarotNum].name;
  tarot.imgUrl = _g.draw.imgUrlPrefix + _g.draw.tarotList[tarotNum].imgUrl;
  tarot.desc   = tarot.direction? 
    _g.draw.tarotList[tarotNum].detail.desc.normotopia: _g.draw.tarotList[tarotNum].detail.desc.inversion;
  return tarot;
}
// random a draw num
function drawTarotNum () {
  return Math.floor(Math.random() * (_g.draw.maxnum+1));
}
// judge if the last record of this address in today
function getTodayState () {
  var limitNum = _g.state.isDebugging? 1000: 0;
  // limitNum = 1000; // TODO: del
  if (_g.draw.allData.length > limitNum) {  // TODO: modify to 0
    var now = new Date();
    console.log('Today: ' + now.getFullYear()   + '年'
                          + (now.getMonth()+1)  + '月'
                          + now.getDate()       + '日');
    var createDate = new Date(_g.draw.allData[0].createdate);
    console.log('CreateDate:' + createDate.getFullYear()  + '年'
                              + (createDate.getMonth()+1) + '月'
                              + createDate.getDate()      + '日');
    if (createDate.getFullYear() === now.getFullYear()
      && createDate.getMonth() === now.getMonth()
      && createDate.getDate()  === now.getDate()) {
        _g.draw.num = _g.draw.allData[0].num;
        console.log('_g.draw.num:'+_g.draw.num);
        return _g.draw.allData[0].num;
    }
  }
  _g.draw.num = -1;
  return -1;
}
// _g.draw.allData -> _g.draw.historyData
function getHistoryData () {
  _g.draw.historyData.length = 0;
  _g.draw.allData.forEach(element => {
    var time = new Date(element.createdate);
    var createDateStr = time.getFullYear()    + '.'
                        + (time.getMonth()+1) + '.'
                        + time.getDate()      + '.';
    var tarot = getTarot(element.num);
    var direction = tarot.direction? '正位': '逆位';
    var tarotStr = tarot.name + '(' + direction + ')';
    _g.draw.historyData.push({'num': element.num, 'tarot': tarotStr, 'createdate': createDateStr});
  });
  _g.state.isHistoryLoading = false;
  loadTableData();
  console.log('history:', _g.draw.historyData);
}


/*** page method ***/
function changeModule (module) {
  // if (_g.state.nowModule === module) { return; }
  if (_g.state.isChanging) { return; }
  switch (module) {
    case 'content':
      initContent();
      break;
    case 'history':
      initHistory();
      break;
    case 'withdraw':
      initWithdraw();
      break;
    case 'instruction':
      initInstruction();
      break;
    case 'about':
      initAbout();
      break;
  }
  // _g.state.nowModule = module;
}
function preventChange (ts) {
  ts = ts? ts: _g.state.changeTime;
  _g.state.isChanging = true;
  // console.log('Module changing start!');
  setTimeout(function () {
    _g.state.isChanging= false;
    // console.log('now finish change!');
  }, ts);
}
// content
function initIntro () {
  setTimeout(function () {
    $('#content').fadeIn();
    $('#p_intro_1').fadeIn(1000);
    $('#p_intro_2').fadeIn(1000);
    $('#p_intro_3').fadeIn(1000);
    $('#p_intro_4').fadeIn(3000);
    $('#p_intro_5').fadeIn(3000);
    $('#p_intro_6').fadeIn(5000);
    $('#p_intro_7').fadeIn(5000);
  }, 500);
  setTimeout(function () {
    $('#intro').fadeOut();
    $('#navbar').fadeIn();
    if (_g.wallet.address) {
      initContent(decideContentPage());
    } else {
      changeModule('instruction');
    }
  }, 5500);
}
// judge targetPage by state
function decideContentPage () {
  var targetPage = '';
  // if (!_g.wallet.plugInExist | !_g.wallet.address | _g.wallet.address.length !== 35) {
  // targetPage = 'wallet';
  // } else 
  if (_g.draw.num < 0) {  // TODO: 考虑网速
    targetPage = 'guide';
  } else {
    targetPage = 'result';
  }
  // TODO: add 网速page
  console.log('decideContentPage result: ', targetPage);
  return targetPage;
}
function initContent (pagename) {
  pagename = pagename? pagename: decideContentPage();
  preventChange();
  $('#history').fadeOut();
  $('#withdraw').fadeOut();
  $('#instruction').fadeOut();
  $('#about').fadeOut();
  setTimeout(function () {
      $('#content').fadeIn();
      switch(pagename) {
        case 'guide':
          initGuidePage();
          break;
        case 'loading':
          initLoadingPage();
          break;
        case 'result':
          initResultPage();
          break;
        case 'wallet':
          initWalletPage();
          break;
      }
  }, 500);
}
function initGuidePage () {
  title.text('今日塔罗');
  console.log('initGuidePage:', _g.draw.num);
  page_loading.fadeOut();
  page_result.fadeOut();
  // page_wallet.fadeOut();
  setTimeout(function () {
    page_guide.fadeIn();
    $('#p_content_1').fadeIn(1000);
    $('#p_content_2').fadeIn(1000);
    $('#p_content_3').fadeIn(1000);
    btn_drawtarot.fadeIn(2000);
  }, 500);
}
function initLoadingPage () {
  title.text('今日塔罗');
  tx_loading.text('正在抽牌'); 
  console.log('initLoadingPage');
  // TODO: js洗牌动画
  // loading text
  page_guide.fadeOut();
  page_result.fadeOut();
  // page_wallet.fadeOut();
  setTimeout(function () {
    page_loading.show();
  }, 500);
}
function initResultPage (num) {
  title.text('今日塔罗');
  console.log('initResultPage');
  page_guide.fadeOut();
  page_loading.fadeOut();
  // page_wallet.fadeOut();

  setTimeout(function () {
    page_result.fadeIn();
    var tarot = getTarot(num);
    if (!num) {
      $('#tx_tip').fadeIn();
      setTimeout(function () {
        $('#tx_tip').fadeOut(1000);
      }, 2000);
    }
    tx_name.text(tarot.name);
    tx_direction.text(tarot.direction? '正位':'逆位');
    img_result.attr('class', tarot.direction? '': 'inversion');
    img_result.attr('src', tarot.imgUrl);
    tx_result_desc.text(tarot.desc);
    
    // fadeIn
    $('#result_name').fadeIn(1000);
    $('#result_diretion').fadeIn(2000);
    img_result.fadeIn(3000);
    $('#result_desc').fadeIn(4000);
    tx_result_desc.fadeIn(5000);
  }, 500);
}
function initWalletPage () {
  page_guide.fadeOut();
  page_loading.fadeOut();
  page_result.fadeOut();
  if (_g.wallet.address && _g.wallet.address.length === 35) {
    console.log('prepare for mobile wallet');
    initContent('guide');
  } else if (!_g.wallet.plugInExist || !_g.wallet.address || _g.wallet.address.length !== 35) {
    title.text('钱包地址获取失败');
    // $('#tx_wallet').text('请安装插件并导入钱包，随后刷新页面');
    // page_wallet.fadeIn();
  } else {
    console.log('emmm');
  }
}

// history
function initHistory () {
  preventChange();
  title.text('往日回溯');
  $('#content').fadeOut();
  $('#withdraw').fadeOut();
  $('#about').fadeOut();
  $('#instruction').fadeOut();
  $('#page_detail').fadeOut();
  setTimeout (function () {
    $('#history').fadeIn();
    initTablePart ();
  }, 500);
}
function loadTableData () {
  console.log('loadTableData');
  $('#page_table table tbody').empty();
  // TODO: if without address
  if (_g.draw.historyData.length > 0) {     // TODO: change to zero
    _g.draw.historyData.forEach(element => {
      var $tr = $('<tr></tr>');
      $tr.append($('<td>'+element.createdate+'</td>'));
      $tr.append($('<td><a href="#" class="text-wheat" onclick="initDetailPart('+element.num+')">'+element.tarot+'</a></td>'));
      $('#page_table table tbody').append($tr);
    });
  } else if (_g.state.isHistoryLoading){
    var $tr = $('<tr></tr>').append($('<td colspan="2">正在加载历史记录中<img src="assert/img/loading.gif" alt="loading"></td>'));
    $('#page_table table tbody').append($tr);
  } else {
    var $tr = $('<tr></tr>').append($('<td colspan="2">暂无数据，<a href="#" class="text-wheat" onclick="changeModule(\'content\')">点击抽取今日塔罗</a></td>'));
    $('#page_table table tbody').append($tr);
  }
}
function initTablePart () {
  loadTableData();
  $('#page_table').fadeIn(2000);
}
function initDetailPart (num) {
  $('#page_table').fadeOut();
  setTimeout(function () {
    $('#page_detail').fadeIn();
    var tarot = getTarot(num);

    $('#detail_name b').text(tarot.name);
    $('#detail_diretion b').text(tarot.direction? '正位':'逆位');
    $('#img_detail').attr('class', tarot.direction? '': 'inversion');
    $('#img_detail').attr('src', tarot.imgUrl);
    $('#tx_detail_desc').text(tarot.desc);
    
    // fadeIn
    $('#detail_name').fadeIn(1000);
    $('#detail_diretion').fadeIn(2000);
    $('#img_detail').fadeIn(3000);
    $('#detail_desc').fadeIn(4000);
    $('#tx_detail_desc').fadeIn(5000);
  }, 1000);
}

// withdraw
function initWithdraw () {
  preventChange();
  title.text('合约提现');
  $('#content').fadeOut();
  $('#history').fadeOut();
  $('#about').fadeOut();
  $('#instruction').fadeOut();
  setTimeout (function () {
    $('#withdraw').fadeIn();
    initWithdrawPart ();
  }, 500);
}
function initWithdrawPart () {
  $('#page_withdraw').fadeIn(1000);
}

// instruction
function initInstruction () {
  preventChange();
  title.text('使用指南');
  $('#content').fadeOut();
  $('#history').fadeOut();
  $('#withdraw').fadeOut();
  $('#about').fadeOut();
  setTimeout (function () {
    $('#instruction').fadeIn();
  }, 500);
}

// about
function initAbout() {
  preventChange();
  title.text('关于作品');
  $('#content').fadeOut();
  $('#history').fadeOut();
  $('#withdraw').fadeOut();
  $('#instruction').fadeOut();
  setTimeout (function () {
    $('#about').fadeIn();
    initAboutPart ();
  }, 500);
}
function initAboutPart() {
  $('#part_about').fadeIn(1000);
}


function collapseClose() {
  // $('#navlist').attr('aria-expanded', 'false');
  $('#navlist').collapse('hide');
}
/*** event handler ***/
btn_drawtarot.on('click', function () {
  console.log('btn_drawtarot click');
  // start loading
  // if (!_g.wallet.plugInExist | !_g.wallet.address | _g.wallet.address.length !== 35) {
  // targetPage = 'wallet';
  // } else 
  initContent('loading');
  save(initResultPage, drawTarotNum());
});
$('#btn_login').on('click', function () {
  getUserData();
});
$('#link_content').on('click', function () {
  collapseClose();
  changeModule('content');
});
$('#link_history').on('click', function () {
  collapseClose();
  changeModule('history');
});
$('#link_withdraw').on('click', function () {
  collapseClose();
  changeModule('withdraw');
});
$('#link_instruction').on('click', function () {
  collapseClose();
  changeModule('instruction');
});
$('#link_about').on('click', function () {
  collapseClose();
  changeModule('about');
});
$('#link_draw').on('click', function () {
  if (_g.wallet.address) {
    initContent(decideContentPage());
  } else {
    getUserData(true);
    $('#instruction_loading').show();
  }
});
$('#quicklink_instruction').on('click', function () {
  collapseClose();
  changeModule('instruction');
});
$('#btn_withdraw').on('click', function () {
  var addr = $('#addr_withdraw').val().trim();
  var value= $('#value_withdraw').val();
  if (addr && value) {
    console.log('addr:'+addr+', value:'+value);
    withDraw(addr, value);
  } else {
    console.log('add & value `can\'t be null');
  }
});


/*** run ***/
// prepare data and state for Pages
getTarotList();
detectWallet();
window.postMessage({
  'target': 'contentscript',
  'data': {},
  'method': 'getAccount'
}, '*');
window.addEventListener('message', function (e) {
  console.log('e:', e);
  if (e.data && e.data.data) {
    if (e.data.data.account) {
      _g.wallet.address = e.data.data.account;
      console.log('_g.wallet.address:', _g.wallet.address);
      getData();
      getDrawTotal();
    }
  }
});
// run page
initIntro();


// get wallet balance、type(gg)
// function getAccountState() {  
//   if (Neb.api) {
//     Neb.api.getAccountState({
//       address: _g.wallet.address
//     }).then (function (data) {
//       console.log('accountState:', data);
//       _g.wallet.balance = data.balance;
//       _g.wallet.type    = data.type;
//     });
//   }
// }