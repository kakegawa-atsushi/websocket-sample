$(function() {
    /** クライアントID：自クライアント */
    var CLIENT_ID_SELF = "self";
    /** WebSocketの接続先 */
    var DESTINATION = "/note";
    
    /** Web Audio API操作ヘルパー */
    var webAudioHelper;
    /** WebSocket操作ヘルパー */
    var webSocketHelper;
    
    // 初期化処理
    new function() {
        // WebSocketの宛先URLを作成
        var protocol = (location.protocol == "https:") ? "wss" : "ws";
        var host = location.host;
        var url = protocol + "://" + host + DESTINATION;
        // WebSocket操作用のヘルパーオブジェクトを生成
        webSocketHelper = new WebSocketHelper();
        // WebSocketオブジェクトを生成
        var webSocket = webSocketHelper.createWebSocket(url);
        if (!webSocket) {
            alert("WebSocketが利用できません。");
            return;
        }
        // WebSocketオブジェクトにイベントハンドラをセット
        webSocket.onopen = webSocketOpenHandler;
        webSocket.onclose = webSocketCloseHandler;
        webSocket.onmessage = webSocketMessageHandler;
        webSocket.onerror = webSocketErrorHandler;
    }
    
    /**
     * WebSocketのopenイベント時のイベントハンドラです。
     * 
     * @param event Event
     */
    function webSocketOpenHandler(event) {
        console.info("connected.");
        
        // Web Audio API操作用のヘルパーオブジェクトを生成
        webAudioHelper = new WebAudioHelper(4096, 1, CLIENT_ID_SELF);
        if (!webAudioHelper.isWebAudioAvailable()) {
            alert("Web Audio APIが利用できません。");
            return;
        }
        
        // イベントハンドラの登録
        $(window).unload(windowUnloadHandler);
        $(".white-key, .black-key").mousedown(keyMouseDownHandler);
        $(".white-key, .black-key").mouseup(keyMouseUpHandler);
        $("input[name='oscillator']").change(oscillatorRadioChangeHandler);
    }

    /**
     * WebSocketのcloseイベント時のイベントハンドラです。
     * 
     * @param event Event
     */
    function webSocketCloseHandler(event) {
        console.info("disconnected.");
    }

    /**
     * WebSocketのmessageイベント時のイベントハンドラです。
     * 
     * @param event Event
     */
    function webSocketMessageHandler(event) {
        console.info("message received:" + event.data);
        
        if (!event.data || event.data == "") {
            return;
        }
        
        // Json形式のデータをデシリアライズ
        var data = JSON.parse(event.data);
        
        var targetElement;
        if (data.type == "noteOn") {
            // 他のクライアントのノートオンイベント
            // 特定のクライアントの音を追加
            webAudioHelper.noteOn(data.note, data.id);
            // キーボードの色を変える
            var noteString = Note.getNoteByValue(data.note);
            var id = noteString + "key";
            targetElement = $("#" + id);
            targetElement.addClass("pressed-by-other");
        } else if (data.type == "noteOff") {
            // 他のクライアントのノートオフイベント
            // 特定のクライアントの音を消す
            webAudioHelper.noteOff(data.id);
            // キーボードの色を戻す
            targetElement = $(".pressed-by-other");
            targetElement.removeClass("pressed-by-other");
        } else if (data.type == "soundTypeChanged") {
            // 特定のクライアントの音色を変更
            var soundType = data.soundType;
            webAudioHelper.changeSound(soundType, data.id);
        } else {
            console.warn("The type of received message is invalid: " + data.type);
        }
    }

    /**
     * WebSocketのerrorイベント時のイベントハンドラです。
     * 
     * @param event Event
     */
    function webSocketErrorHandler(event) {
        console.error(event.data);
    }

    /**
     * ブラウザのunloadイベント時のイベントハンドラです。
     * 
     * @param event Event
     */
    function windowUnloadHandler(event) {
        webAudioHelper.close();
        webSocketHelper.close();
    }
    
    /**
     * 演奏用キーボードのmousedownイベント時のイベントハンドラです。
     * 
     * @param event Event
     */
    function keyMouseDownHandler(event) {
        // 押されたキーに対応する音を発音
        var note = getNoteFromEvent(event);
        webAudioHelper.noteOn(note, CLIENT_ID_SELF);
        // ノートオンをサーバーに通知
        var data = { type : "noteOn", note : note };
        webSocketHelper.sendData(data);
        // 押されたキーの色を変更
        var target = $(event.target);
        target.addClass("pressed");
        target.bind("mouseout", keyMouseUpHandler);
    }

    /**
     * 演奏用キーボードのmouseupイベント時のイベントハンドラです。
     * 
     * @param event Event
     */
    function keyMouseUpHandler(event) {
        // 自クライアントの音を消す
        webAudioHelper.noteOff(CLIENT_ID_SELF);
        // ノートオフをサーバーに通知
        var data = { type : "noteOff", note : null };
        webSocketHelper.sendData(data);
        // キーの色を戻す
        var target = $(".pressed");
        target.removeClass("pressed");
        target.unbind("mouseout", keyMouseUpHandler);
    }

    /**
     * 音色選択ラジオボタンの変更イベント時のイベントハンドラです。
     * 
     * @param event Event
     */
    function oscillatorRadioChangeHandler(event) {
        // 自クライアントの音色を変更
        var value = parseInt($("'[name='oscillator']:checked'").val());
        webAudioHelper.changeSound(value, CLIENT_ID_SELF);
        // 音色の変更をサーバーに通知
        var data = { type : "soundTypeChanged", soundType : value };
        webSocketHelper.sendData(data);
    }

    /**
     * マウスイベントから対応するノートナンバーを取得します。
     * 
     * @param event Event マウスイベント
     * @return 対応するノートナンバー
     */
    function getNoteFromEvent(event) {
        var note = null;
        var regExp = new RegExp("([\\S]+)key");
        var matched = regExp.test(event.target.id);
        if (matched) {
            note = Note[RegExp.$1]
        }
        return note;
    }
})

/**
 * WebSocketを操作するヘルパーオブジェクトです。
 */
var WebSocketHelper = (function() {
    
    function WebSocketHelper() {
        /** WebSocket */
        var webSocket = null;
        
        /**
         * 指定されたURLに接続するWebSocketオブジェクトを生成して返します。
         * 
         * @param url 接続先URL
         * @return WebSocketオブジェクト
         */
        this.createWebSocket = function(url) {
            try {
                webSocket = new WebSocket(url);
            } catch (e) {
                console.error(e.toString());
                return null;
            }
            return webSocket;
        };
        
        /**
         * WebSocketを利用してデータを送信します。
         * 
         * <p>データはJSON形式のテキストに変換して送信されます。</p>
         * 
         * @param data 送信するデータ
         */
        this.sendData = function(data) {
            if (!webSocket) {
                return;
            }
            var message = JSON.stringify(data);
            webSocket.send(message);
        };
        
        /**
         * WebSocketの接続を閉じ、WebSocketオブジェクトの参照を切ります。
         */
        this.close = function() {
            if (!webSocket) {
                return;
            }
            webSocket.close();
            webSocket = null;
        }
    }
    
    return WebSocketHelper;
}());
