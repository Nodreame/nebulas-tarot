# Todo-List

## 1.Design & Dev basic version, then save it as branch-common

- Page
  - Content
  - History
  - Withdraw
  - About
- [x] Method
  - [x] common
    - [x] getTarotList
    - [x] getTodayState(wait for @storage)
    - [x] drawTarotNum
    - [x] renderTarotByNum
  - [x] page
    - [x] initIntro
    - [x] initContent
    - [x] initWallet
- [x] Tip of Repeated Draw (Show for two seconds)

## 2.Design Contract and test in the testNet

- [x] Chain Storage
  - object: address, num, createtime
  - Method: save(num, createtime) & getData()
- [x] Contract
  - DrawItem
    - constructor: num & createdate & address
    - prototype:   toString
  - DrawContract
    - LocalContractStorage
      - defineProperty: ownerAddress(default) & drawTotal(BigNumber)
      - defineMapProperty: arrayMap(default) & dataMap(DrawItem)
    - prototype
      - init (ownerAddress->Blockchain.transaction.from, drawTotal->0)
      - _isOwner
      - setOwner 【for owner】
      - getOwner
      - withdraw 【for owner】
      - save
      - getData
      - getDrawTotal
      - transaction 【ToDo: To study】

## 3.Mobile First

- [x] Detect UserAddress First
- [x] getUserAddress, show main-content & detect if today drew
- [x] cannot getUserAddress, show initIntro for teching and ask for login
  - [x] tech new user how to create wallet & download extension|Nas.nano
  - [x] in app, u can login by transaction

## 4.Test

- [x] System Stability
  - [x] Method
  - [x] Operate
- [x] Contract
  - [x] Switch module
  - [x] Draw

## 5. Bug

- [ ] Can't quickly detect on the mobile whether has been drawn today.