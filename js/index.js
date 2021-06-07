'use strict'

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
    return typeof obj
} : function (obj) {
    return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj
}

function _toConsumableArray(arr) {
    if (Array.isArray(arr)) {
        for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) {
            arr2[i] = arr[i]
        }
        return arr2
    } else {
        return Array.from(arr)
    }
}

class Robot {
    constructor() {
        self.api = "https://api.tianapi.com/txapi/robot/index"
        self.apiKey = '1163bbd3f06548be85c4202e761205f9'
        self.userId = "bot"
    }

    talk(msg, callback) {
        let data = {
            "key": "46bbb02512f49549ebbf99d53f313963",
            "question": msg
        }
        $.getJSON(self.api, data, function (data) {
            if (data.code === 200) {
                callback(data.newslist)
            }
            return []
        })
    }
}

(function () {
    String.prototype.replaceAll = function (s1, s2) {
        return this.replace(new RegExp(s1, "gm"), s2)
    }

    var AUTHOR = {
        AUTHOR: 'author',
        ME: 'me'
    }

    var TYPING_MSG_CONTENT = '\n        <div class="dot"></div>\n        <div class="dot"></div>\n        <div class="dot"></div>\n    '

    var msgSendingHandler = null

    var vm = new Vue({
        el: '#mobile',

        data: {
            messages: [],
            dialogs: null,
            lastDialog: null,
            apologize: null,
            msgChain: Promise.resolve(),

            isTyping: false,

            // topics that user can ask
            nextTopics: [],

            hasPrompt: false,

            latestMsgContent: null,
            talkMsg: ''
        },

        mounted: function mounted() {
            var _this = this

            $.getJSON('./assets/dialog.json', function (data) {
                _this.dialogs = data

                _this.nextTopics = data.fromUser

                _this.appendDialog('start')
            })
            $.getJSON('./assets/apologize.json', function (data) {
                _this.apologize = data
            })
        },


        methods: {
            getPlaceHolder: function () {
                return this.isTyping ? "小王正在输入中" : "我想说……"
            },
            sendRobot: function () {
                this.sendMsg(this.talkMsg, AUTHOR.ME)
                let that = this;
                (new Robot()).talk(this.talkMsg, function (msgs) {
                    msgs.forEach(function (val, index) {
                        that.sendMsg(val.reply, AUTHOR.AUTHOR)
                    })
                    that.talkMsg = ''
                })
            },
            appendDialog: function appendDialog(id) {
                var _this2 = this
                if (id && (typeof id === 'undefined' ? 'undefined' : _typeof(id)) === 'object' && id.length > 0) {
                    // array of dialog ids
                    id.forEach(function (id) {
                        return _this2.appendDialog(id)
                    })
                    return
                } else if (id == null) {
                    // clear possible responses
                    this.lastDialog.responses = null
                    return
                }

                this.isTyping = true

                var dialog = this.getDialog(id)
                getRandomMsg(dialog.details).forEach(function (content) {
                    _this2.msgChain = _this2.msgChain.then(function () {
                        return delay(700)
                    }).then(function () {
                        return _this2.sendMsg(content, AUTHOR.AUTHOR)
                    })
                })

                return dialog.nextAuthor ? this.appendDialog(dialog.nextAuthor) : this.msgChain.then(function () {
                    _this2.lastDialog = dialog
                    _this2.isTyping = false
                })
            },
            sendMsg: function sendMsg(message, author) {
                switch (author) {
                    case 'me':
                        return this.sendUserMsg(message)
                    default:
                        return this.sendFriendMsg(message, author)
                }
            },
            sendFriendMsg: function sendFriendMsg(message, author) {
                var _this3 = this

                var content = getRandomMsg(message)
                var length = content.replace(/<[^>]+>/g, "").length
                var isImg = /<img[^>]+>/.test(content)
                var isTyping = length > 2 || isImg

                var msg = {
                    author: author,
                    content: isTyping ? TYPING_MSG_CONTENT : content,
                    isImg: isImg
                }
                this.messages.push(msg)

                if (isTyping) {
                    this.markMsgSize(msg)
                    setTimeout(updateScroll)

                    return delay(Math.min(100 * length, 2000)).then(function () {
                        return _this3.markMsgSize(msg, content)
                    }).then(function () {
                        return delay(150)
                    }).then(function () {
                        msg.content = content
                        onMessageSending()
                    })
                }

                onMessageSending()

                return Promise.resolve()
            },
            sendUserMsg: function sendUserMsg(message) {
                this.messages.push({
                    author: AUTHOR.ME,
                    content: message
                })

                onMessageSending()

                return Promise.resolve()
            },
            markMsgSize: function markMsgSize(msg) {
                var _this4 = this

                var content = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null

                this.latestMsgContent = content || msg.content

                return delay(0).then(function () {
                    return msg.isImg && onImageLoad($('#mock-msg img'))
                }).then(function () {
                    Object.assign(msg, getMockMsgSize())
                    _this4.messages = [].concat(_toConsumableArray(_this4.messages))
                })
            },
            getDialog: function getDialog(id) {
                // only one dialog should be matched by id
                var dialogs = this.dialogs.fromMe.filter(function (dialog) {
                    return dialog.id === id
                })
                return dialogs ? dialogs[0] : null
            },
            getDialogFromUser: function getDialogFromUser(id) {
                // only one dialog should be matched by id
                var dialogs = this.dialogs.fromUser.filter(function (dialog) {
                    return dialog.id === id
                })
                return dialogs ? dialogs[0] : null
            },
            togglePrompt: function togglePrompt(toShow) {
                if (this.isTyping) {
                    // don't prompt if author is typing
                    return
                }

                this.hasPrompt = toShow
            },
            generateApology: function generateApology(eventStr) {
                let NICKNAME_LEN = this.apologize.nickname.length
                let APOLOGY = this.apologize.apology.length
                let APOLOGY_TEXT = this.apologize.apology_text.length
                let bullshit = ''
                let randNum
                bullshit += this.apologize.nickname[genRandInt(NICKNAME_LEN - 1)]
                bullshit += this.apologize.apology[genRandInt(APOLOGY - 1)]
                while (bullshit.length <= 1000) {
                    randNum = genRandInt(15)
                    if (randNum % 4 === 0) {
                        bullshit += this.apologize.nickname[genRandInt(NICKNAME_LEN - 1)]
                        bullshit += this.apologize.apology[genRandInt(APOLOGY - 1)]
                    } else {
                        bullshit += this.apologize.apology_text[genRandInt(APOLOGY_TEXT - 1)]
                    }
                }

                bullshit = bullshit.replaceAll("name", this.apologize.name)
                bullshit = bullshit.replaceAll("event", eventStr)
                return bullshit

            },
            respond: function respond(response) {
                let res = ''
                let nextAuthor = null

                if (response.event) {
                    res = response.content
                    nextAuthor = "load"+response.event
                    // 手动添加语料, details 是双重列表
                    this.dialogs.fromMe.push({
                        id: nextAuthor,
                        details : [
                            [this.generateApology(response.content)]
                        ]
                    })
                } else {
                    res = response.content
                    nextAuthor = response.nextAuthor
                }

                return this.say(res, nextAuthor)
            },
            ask: function ask(fromUser) {
                let content = ''
                let nextAuthor = null
                switch (fromUser.id) {

                    default:
                        content = getRandomMsg(fromUser.details)
                        nextAuthor = fromUser.nextAuthor // 加载下一段
                        break

                }
                return this.say(content, nextAuthor)
            },
            say: function say(content, dialogId = null) {
                var _this5 = this

                // close prompt
                this.hasPrompt = false

                return delay(200)
                    // send user msg
                    .then(function () {
                        return _this5.sendMsg(content, AUTHOR.ME)
                    }).then(function () {
                        return delay(300)
                    })
                    // add author's next dialogs
                    .then(function () {
                        return _this5.appendDialog(dialogId)
                    })
            }
        }
    })


    function genRandInt(end) {
        return Math.ceil((end) * Math.random())
    }

    /**
     * get a random message from message array
     */
    function getRandomMsg(messages) {
        // single item
        if (typeof messages === 'string' || !messages.length) {
            return messages
        }

        var id = Math.floor(Math.random() * messages.length)
        return messages[id]
    }

    /**
     * UI updating when new message is sending
     */
    function onMessageSending() {
        setTimeout(function () {
            // update scroll position when vue has updated ui
            updateScroll()

            var $latestMsg = $('#mobile-body-content .msg-row:last-child .msg')

            // add target="_blank" for links
            $latestMsg.find('a').attr('target', '_blank')

            // update scroll position when images are loaded
            onImageLoad($latestMsg).then(updateScroll)
        })
    }

    function updateScroll() {
        var $chatbox = $('#mobile-body-content')

        var distance = $chatbox[0].scrollHeight - $chatbox.height() - $chatbox.scrollTop()
        var duration = 250
        var startTime = Date.now()

        requestAnimationFrame(function step() {
            var p = Math.min(1, (Date.now() - startTime) / duration)
            $chatbox.scrollTop($chatbox.scrollTop() + distance * p)
            p < 1 && requestAnimationFrame(step)
        })
    }

    function delay() {
        var amount = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0

        return new Promise(function (resolve) {
            setTimeout(resolve, amount)
        })
    }

    function getMockMsgSize() {
        var $mockMsg = $('#mock-msg')
        return {
            width: $mockMsg.width(),
            height: $mockMsg.height()
        }
    }

    function onImageLoad($img) {
        return new Promise(function (resolve) {
            $img.one('load', resolve).each(function (index, target) {
                // trigger load when the image is cached
                target.complete && $(target).trigger('load')
            })
        })
    }
})()