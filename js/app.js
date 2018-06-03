// init var
var title         = $('#title');
var page_guide    = $('#page_guide');
var page_loading  = $('#page_loading');
var page_result   = $('#page_result');
var page_wallet   = $('#page_wallet');
var btn_drawtarot = $('#btn_drawtarot');
var tx_loading    = $('#tx_loading');
var tx_name       = $('#tx_name');
var tx_direction  = $('#tx_direction');
var tx_result_desc= $('#tx_result_desc');
var img_result    = $('#img_result');

var _g        = {};
_g.state      = {};
_g.draw       = {};
_g.wallet     = {};
_g.contract   = {};
_g.transaction= {};
// state
_g.state.isDebugging= false;
_g.state.nowModule  = 'content';
_g.state.isChanging = false;
_g.state.changeTime = 1000;
_g.state.contentPage= '';
_g.state.historyPage= '';
// draw
_g.draw.prefix_img = 'assert/img/MajorArcana/';
_g.draw.num    = -1;     // 抽牌数字
_g.draw.maxnum = 43;
_g.draw.allData= [];
_g.draw.tarotList  = [];
_g.draw.total  = 0;
_g.draw.historyData = [];
// wallet              MY: 'n1J7r1GDiHQ9Zc8XVzjPkwua68PQZ4dGH3L'
_g.wallet.address     = '';
_g.wallet.balance     = -1;
_g.wallet.type        = 87;
_g.wallet.plugInExist = false;
_g.wallet.addrExist   = false;
// contract
_g.contract.mainnetUrl = 'https://mainnet.nebulas.io';
_g.contract.testnetUrl = 'https://testnet.nebulas.io';
_g.contract.address = _g.state.isDebugging? 'n1vTNx5Q2hx8KALF1NFTxu7KMh5LWEsVRPo': 'n1g5eFS5Egx3Nykigv6uAEaczDgXunirz29';    
_g.transaction.isFinish= true;

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
// get wallet balance、type
function getAccountState() {  
  if (Neb.api) {
    Neb.api.getAccountState({
      address: _g.wallet.address
    }).then (function (data) {
      console.log('accountState:', data);
      _g.wallet.balance = data.balance;
      _g.wallet.type    = data.type;
    });
  }
}

/*** chain method ***/
function save (callback, num) {
  var listenCount = 0;
  _g.transaction.isFinish = false;
  var nebPayListener = function (data) {
    console.log('nebPayListener data:', data);
    if (listenCount < 15) {
      Neb.api.getTransactionReceipt({
        hash: data.txhash
      }).then (function (response) { // status: 2(pending) 1(success)
        console.log('response:', response); 
        if (response.status === 1) {
          console.log('success!');
          _g.transaction.isFinish = true;
          callback.call(this, num);
          getData();
        } else {
          listenCount++;
          setTimeout(() => {
            nebPayListener(data);
          }, 5000);
        }
      });
    } else {
      // TODO: stop 抽牌
      // TODO: 取消交易
    }
  }  

  var to        = _g.contract.address;
  var value     = '0';
  var callFunc  = 'save';
  var callArgs  = JSON.stringify([_g.draw.num, _g.draw.time]);
  var options   = {
    goods: {
      name: "tarot result"
    },
    callback: _g.state.isDebugging? NebPay.config.testnetUrl: NebPay.config.mainnetUrl,
    listener: nebPayListener
  };
  _g.transaction.serialNum = nebPay.call(to, value, callFunc, callArgs, options);
  /*** can't get success callback ***/
  // _g.transaction.intervalQuery = setInterval(function() {
  //   nebPay.queryPayInfo(_g.transaction.serialNum, options)
  //     .then(function (dataStr) {
  //       var data = JSON.parse(dataStr);
  //       console.log('data:', data);
  //       if (data.code === 0 && data.data.status === 1) {
  //         clearInterval(_g.transaction.intervalQuery);
  //       }
  //     })
  //     .catch(function (error) {
  //       console.log(error);
  //     });
  // }, 10000);
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
      console.log('tarotList:', result);
      _g.draw.tarotList = result;
      return result;
    }
  });
}
// random a draw num
function drawTarotNum () {
  return Math.floor(Math.random() * (_g.draw.maxnum+1));
}
function getCard(num) {
  console.log('num:', num);
  var tarot = {};
  var halfNum = (_g.draw.maxnum + 1)/2;
  var tarotNum = -1;
  if (num) {                      // 有num用num
    tarotNum = num? num: -1;
  } else if (_g.draw.num < 0) {   // 无num & _g.draw.num 就抽
    _g.draw.num = drawTarotNum();
    tarotNum = _g.draw.num;
  } else {                        // 无num & 有_g.draw.num直接赋值
    tarotNum = _g.draw.num;
  }
  if (tarotNum >= halfNum) {
    tarot.direction = false;
    tarotNum -= halfNum;
  } else {
    tarot.direction = true;
  }
  console.log('tarotNum:', tarotNum);
  tarot.name   = _g.draw.tarotList[tarotNum].name;
  tarot.imgUrl = _g.draw.prefix_img + _g.draw.tarotList[tarotNum].imgUrl;
  tarot.desc   = tarot.direction? 
    _g.draw.tarotList[tarotNum].detail.desc.normotopia: _g.draw.tarotList[tarotNum].detail.desc.inversion;
  return tarot;
}
// judge if the last record of this address in today
function getTodayState () {
  if (_g.draw.allData.length > 0) {
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
        // _g.draw.isDraw = true;
        _g.draw.num = _g.draw.allData[0].num;
        // console.log('_g.draw.isDraw:'+_g.draw.isDraw+',_g.draw.num:'+_g.draw.num);
        console.log('_g.draw.num:'+_g.draw.num);
        return _g.draw.allData[0].num;
    }
  }
  // _g.draw.isDraw = false;
  _g.draw.num = -1;
  return -1;
}
// prepare data for history
function getHistoryData () {
  // _g.draw.allData -> _g.draw.historyData
  _g.draw.historyData.length = 0;
  _g.draw.allData.forEach(element => {
    var time = new Date(element.createdate);
    var createDateStr = time.getFullYear()    + '年'
                        + (time.getMonth()+1) + '月'
                        + time.getDate()      + '日';
    var tarot = getCard(element.num);
    var direction = tarot.direction? '正位': '逆位';
    var tarotStr = tarot.name + '(' + direction + ')';
    _g.draw.historyData.push({'num': element.num, 'tarot': tarotStr, 'createdate': createDateStr});
  });
  console.log('history:', _g.draw.historyData);
}


/*** page method ***/
// state
function changeModule (module) {
  if (_g.state.nowModule === module) { return; }
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
    case 'about':
      initAbout();
      break;
  }
  _g.state.nowModule = module;
}
function preventChange (ts) {
  ts = ts? ts: _g.state.changeTime;
  _g.state.isChanging = true;
  console.log('Module changing start!');
  setTimeout(function () {
    _g.state.isChanging= false;
    console.log('now finish change!');
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
    $('#p_intro_6').fadeIn(6000);
    $('#p_intro_7').fadeIn(6000);
  }, 500);
  setTimeout(function () {
    $('#intro').fadeOut();
    $('#navbar').fadeIn();
    initContent(decideContentPage());
  }, 6500);
}
function decideContentPage () {
  var targetPage = '';
  if (!_g.wallet.plugInExist | !_g.wallet.address | _g.wallet.address.length !== 35) {
    targetPage = 'wallet';
  } else if (_g.draw.num < 0) {  // TODO: 考虑网速
    // !_g.draw.isDraw &&
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
  $('#about').fadeOut();
  setTimeout(function () {
    // if (_g.state.contentPage !== pagename) {
      $('#content').fadeIn();
      _g.state.contentPage = pagename;
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
    // }
  }, 500);
}
function initGuidePage () {
  title.text('今日塔罗');
  console.log('initGuidePage:', _g.draw.num);
  page_loading.fadeOut();
  page_result.fadeOut();
  page_wallet.fadeOut();
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
  // TODO: js洗牌动画
  // loading text
  page_guide.fadeOut();
  page_result.fadeOut();
  page_wallet.fadeOut();
  var drawTarot_interval = setInterval(function () {
    var content = tx_loading.text() + '.';
    tx_loading.text(content);
  }, 1000);
  setTimeout(function () {
    clearInterval(drawTarot_interval);
    if (!_g.transaction.isFinish) {
      tx_loading.text("正在抽牌");
      initLoadingPage();
    }
  }, 3000);
}
function initResultPage (num) {
  title.text('今日塔罗');
  console.log('initResultPage');
  page_guide.fadeOut();
  page_loading.fadeOut();
  page_wallet.fadeOut();

  setTimeout(function () {
    page_result.fadeIn();
    var tarot = getCard(num);
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
  if ( !_g.wallet.address || _g.wallet.address.length !== 35) {
    title.text('钱包地址查询失败');
    $('#tx_wallet').text('请将钱包导入插件，随后刷新页面');
    page_wallet.fadeIn();
  } else {
    title.text('未检测到浏览器钱包插件');
    page_wallet.fadeIn();
  }
}

// history
function initHistory () {
  preventChange();
  title.text('往日回溯');
  $('#content').fadeOut();
  $('#withdraw').fadeOut();
  $('#about').fadeOut();
  $('#page_detail').fadeOut();
  setTimeout (function () {
    $('#history').fadeIn();
    initTablePart ();
  }, 500);
}
function initTablePart () {
  console.log("$('#page_table table tbody'):", $('#page_table table tbody'));
  $('#page_table table tbody').empty();
  if (_g.draw.historyData.length > 0) {     // TODO: change to zero
    _g.draw.historyData.forEach(element => {
      var $tr = $('<tr></tr>');
      $tr.append($('<td>'+element.createdate+'</td>'));
      $tr.append($('<td><a href="#" class="text-wheat" onclick="initDetailPart('+element.num+')">'+element.tarot+'</a></td>'));
      $('#page_table table tbody').append($tr);
    });
  } else {
    var $tr = $('<tr></tr>').append($('<td colspan="2">暂无数据，<a href="#" class="text-wheat" onclick="changeModule(\'content\')">点击抽取今日塔罗</d></td>'));
    $('#page_table table tbody').append($tr);
  }
  
  $('#page_table').fadeIn(2000);
}
function initDetailPart (num) {
  $('#page_table').fadeOut();
  setTimeout(function () {
    $('#page_detail').fadeIn();
    var tarot = getCard(num);

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
  setTimeout (function () {
    $('#withdraw').fadeIn();
    initWithdrawPart ();
  }, 500);
}
function initWithdrawPart () {
  $('#page_withdraw').fadeIn(1000);
}

// about
function initAbout() {
  preventChange();
  title.text('关于作品');
  $('#content').fadeOut();
  $('#history').fadeOut();
  $('#withdraw').fadeOut();
  setTimeout (function () {
    $('#about').fadeIn();
    initAboutPart ();
  }, 500);
}
function initAboutPart() {
  $('#part_about').fadeIn(1000);
}



/*** event handler ***/
btn_drawtarot.on('click', function () {
  console.log('btn_drawtarot click');
  // start loading
  page_guide.hide();
  page_loading.show();
  initLoadingPage();
  // draw & save
  _g.draw.num = drawTarotNum();
  _g.draw.time= Date.now();
  console.log('_g.draw.num:'+_g.draw.num+', _g.draw.time:'+_g.draw.time);
  save(initResultPage, _g.draw.num);
});
$('#link_content').on('click', function () {
  changeModule('content');
});
$('#link_history').on('click', function () {
  changeModule('history');
});
$('#link_withdraw').on('click', function () {
  changeModule('withdraw');
});
$('#link_about').on('click', function () {
  changeModule('about');
});
$('#btn_withdraw').on('click', function () {
  // TODO: verityAddress & transfer
  var addr = $('#addr_withdraw').val().trim();
  var value= $('#value_withdraw').val();
  if (addr && value) {
    console.log('addr:'+addr+', value:'+value);
    withDraw(addr, value);
  } else {
    // TODO: show tip
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