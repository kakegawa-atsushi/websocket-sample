/**
 * Web Audio APIを操作するヘルパーオブジェクトです。
 */
var WebAudioHelper = (function() {
    
    /**
     * コンストラクタです。
     * 
     * @param bufferSize サウンドデータ処理時のバッファサイズ
     * @param channelNumber 出力チャネル数
     * @param selfClientId 自クライアントのID
     */
    function WebAudioHelper(bufferSize, channelNumber, selfClientId) {
        /** 基準A音の周波数 */
        var FREQUENCY_A4 = 440;
        /** サンプリングレート */
        var SAMPLING_RATE = 44100;
        /** サウンドデータ処理時のバッファサイズ */
        var BUFFER_SIZE = bufferSize;
        
        /** AudioContext */
        var context = null;
        /** JavaScriptAudioNode */
        var node;
        /** 各クライアントのオーディオストリームジェネレータを格納する連想配列 */
        var generatorMap;
        
        // 初期化処理
        new function() {
            // AudioContextを生成
            try {
                context = new webkitAudioContext();
            } catch (e) {
                console.error(e.toString());
            }
            
            if (context) {
                // AudioContextからJavaScriptAudioNodeを取得
                node = context.createJavaScriptNode(BUFFER_SIZE, 1, channelNumber);
                // AudioNodeを出力に接続
                node.connect(context.destination);
                
                // 自クライアントのオーディオストリームジェネレータを登録
                generatorMap = {};
                generatorMap[selfClientId] = new AudioStreamGenerator(
                        AudioStreamGenerator.OSCILLATOR_TYPE_SINE, SAMPLING_RATE, BUFFER_SIZE);
                
                // オーディオ処理イベントのイベントハンドラをセット
                node.onaudioprocess = nodeAudioProcessHandler;
            }
        }
        
        /**
         * JavaScriptAudioNodeのオーディオ処理イベント時のイベントハンドラです。
         * 
         * @param event AudioProcessingEvent
         */
        function nodeAudioProcessHandler(event) {
            // 左右チャネルのオーディオストリームの参照を取得
            var leftChannelData = event.outputBuffer.getChannelData(0);
            var rightChannelData = event.outputBuffer.getChannelData(1);
            
            // サウンドデータを作成
            var s = getSoundStream();
            
            // サウンドデータを各オーディオストリームにセット
            leftChannelData.set(s);
            rightChannelData.set(s);
        }
        
        /**
         * サウンドデータを作成します。
         * 
         * @return サウンドデータ
         */
        function getSoundStream() {
            // サウンドデータを格納する配列を用意
            var stream = new Float32Array(BUFFER_SIZE);
            
            // 各クライアントのオーディオジェネレータからサウンドデータを取得して合成
            for (key in generatorMap) {
                var generator = generatorMap[key];
                if (!generator.isActive) {
                    continue;
                }
                var tempStream = generator.next();
                for (var i = 0; i < BUFFER_SIZE; i++) {
                    stream[i] += tempStream[i];
                }
            }
            return stream;
        }
        
        /**
         * ノートナンバーから対応する周波数を取得します。
         * 
         * @param note ノートナンバー
         * @return 周波数
         */
        function getFrequencyByNote(note) {
            return FREQUENCY_A4 * Math.pow(2, (note - Note.A4) / 12);
        }
        
        /**
         * クライアントIDから対応するオーディオジェネレータを取得します。
         * 
         * @param clientId クライアントID
         * @return オーディオジェネレータ
         */
        function getGeneratorById(clientId) {
            var generator;
            if (clientId in generatorMap) {
                generator = generatorMap[clientId];
            } else {
                // ジェネレータがなかったら生成
                generator = new AudioStreamGenerator(
                        AudioStreamGenerator.OSCILLATOR_TYPE_SINE, SAMPLING_RATE, BUFFER_SIZE);
                generatorMap[clientId] = generator;
                console.debug("Create generator. id:" + clientId);
            }
            return generator;
        }
        
        /**
         * Web Audio APIが使用可能であるかを返します。
         * 
         * @return Web Audio APIが使用可能であるか
         */
        this.isWebAudioAvailable = function() {
            return context != null;
        }
        
        /**
         * 指定されたクライアントの音を出力します。
         * 
         * @param note 出力する音のノート
         * @param clientId 音を出力するクライアントのID
         */
        this.noteOn = function(note, clientId) {
            var generator = getGeneratorById(clientId);
            generator.activate(getFrequencyByNote(note));
        }
        
        /**
         * 指定されたクライアントの音を消します。
         * 
         * @param clientId 音を消すクライアントのID
         */
        this.noteOff = function(clientId) {
            var generator = getGeneratorById(clientId);
            generator.deactivate();
        }
        
        /**
         * 指定されたクライアントの音色を変更します。
         * 
         * @param typeValue 音色のタイプ値
         * @param clientId 音色を変更するクライアントのID
         */
        this.changeSound = function(typeValue, clientId) {
            var generator = getGeneratorById(clientId);
            generator.changeOscillator(typeValue);
        }
        
        /**
         * JavaScriptAudioNodeの出力への接続を切断します。
         */
        this.close = function() {
            node.disconnect();
        }
    }
    
    return WebAudioHelper;
}());

/**
 * サウンドデータを生成するオブジェクトです。
 */
var AudioStreamGenerator = (function() {
    
    /** オシレータタイプ：正弦波 */
    AudioStreamGenerator.OSCILLATOR_TYPE_SINE = 0;
    /** オシレータタイプ：のこぎり波 */
    AudioStreamGenerator.OSCILLATOR_TYPE_SAW = 1;
    /** オシレータタイプ：矩形波 */
    AudioStreamGenerator.OSCILLATOR_TYPE_SQUARE = 2;
    /** オシレータタイプ：三角波 */
    AudioStreamGenerator.OSCILLATOR_TYPE_TRIANGLE = 3;
    
    /**
     * コンストラクタです。
     * 
     * @param oscillatorType オシレータのタイプ
     * @param samplingRate サンプリングレート
     * @param bufferSize サウンドデータ処理時のバッファサイズ
     */
    function AudioStreamGenerator(oscillatorType, samplingRate, bufferSize) {
        /** サウンドデータ処理時のバッファサイズ */
        var BUFFER_SIZE = bufferSize;
        /** サンプリングレート */
        var SAMPLING_RATE = samplingRate;
        
        /** オシレータ */
        var oscillator = null;
        /** サウンドデータの取得位置 */
        var offset = 0;
        /** 出力する音の周波数 */
        var frequency;
        /** １サンプルあたりのoffsetの増加量 */
        var step;
        
        /** このジェネレータがサウンドデータを生成する状態であるか */
        AudioStreamGenerator.prototype.isActive = false;
        
        /**
         * このジェネレータをサウンドデータを生成する状態にします。
         * 
         * @param newFrequency 出力する音の周波数
         */
        this.activate = function(newFrequency) {
            frequency = newFrequency
            // １サンプルあたりのoffsetの増加量を算出
            step = 2 * Math.PI * frequency / SAMPLING_RATE;
            // ジェネレータをアクティブに
            this.isActive = true;
        }
        
        /**
         * このジェネレータをサウンドデータを生成しない状態にします。
         */
        this.deactivate = function() {
            // 各パラメータをリセット
            frequency = 0;
            step = 0;
            offset = 0;
            // ジェネレータを非アクティブに
            this.isActive = false;
        }
        
        /**
         * 次のサウンドデータを返します。
         * 
         * @return サウンドデータ
         */
        this.next = function() {
            var length = BUFFER_SIZE;
            var stream = new Float32Array(length);
            // バッファサイズ分のサウンドデータを取得
            for (var i = 0; i < length; i++) {
                stream[i] = oscillator.getData(offset) * 0.25;
                offset += step;
            }
            return stream;
        }
        
        /**
         * オシレータを変更します。
         * 
         * @param type オシレータのタイプ
         */
        this.changeOscillator = function(type) {
            switch (type) {
                case AudioStreamGenerator.OSCILLATOR_TYPE_SINE:
                    oscillator = new SineWaveOscillator();
                    break;
                case AudioStreamGenerator.OSCILLATOR_TYPE_SAW:
                    oscillator = new SawWaveOscillator();
                    break;
                case AudioStreamGenerator.OSCILLATOR_TYPE_SQUARE:
                    oscillator = new SquareWaveOscillator();
                    break;
                case AudioStreamGenerator.OSCILLATOR_TYPE_TRIANGLE:
                    oscillator = new TriangleWaveOscillator();
                    break;
                default:
                    oscillator = new SineWaveOscillator();
                    break;
            }
        }
        
        this.changeOscillator(oscillatorType);
    }
    
    return AudioStreamGenerator;
}());

/**
 * 正弦波を生成するオシレータです。
 */
var SineWaveOscillator = function() {
    this.getData = function(offset) {
        return Math.sin(offset);
    }
};

/**
 * のこぎり波を生成するオシレータです。
 */
var SawWaveOscillator = function() {
    this.getData = function(offset) {
        return (offset % (Math.PI * 2)) / (Math.PI * 2) * 2 - 1;
    }
};

/**
 * 矩形波を生成するオシレータです。
 */
var SquareWaveOscillator = function() {
    this.getData = function(offset) {
        return Math.sin(offset) > 0 ? 0.8 : -0.8;
    }
};

/**
 * 三角波を生成するオシレータです。
 */
var TriangleWaveOscillator = function() {
    this.getData = function(offset) {
        return Math.asin(Math.sin(offset)) / (Math.PI / 2);
    }
};

/**
 * 音階を定義するオブジェクトです。
 */
var Note = (function() {
    
    Note.C4 = 60;
    Note.Cs4 = 61;
    Note.D4 = 62;
    Note.Ds4 = 63;
    Note.E4 = 64;
    Note.F4 = 65;
    Note.Fs4 = 66;
    Note.G4 = 67;
    Note.Gs4 = 68;
    Note.A4 = 69;
    Note.As4 = 70;
    Note.B4 = 71;
    Note.C5 = 72;
    
    function Note() {
    }
    
    /**
     * ノートナンバーからノート文字列を取得します。
     * 
     * @param value ノートナンバー
     * @return ノート文字列
     */
    Note.getNoteByValue = function(value) {
        var note;
        switch(value) {
            case Note.C4:
                note = "C4";
                break;
            case Note.Cs4:
                note = "Cs4";
                break;
            case Note.D4:
                note = "D4";
                break;
            case Note.Ds4:
                note = "Ds4";
                break;
            case Note.E4:
                note = "E4";
                break;
            case Note.F4:
                note = "F4";
                break;
            case Note.Fs4:
                note = "Fs4";
                break;
            case Note.G4:
                note = "G4";
                break;
            case Note.Gs4:
                note = "Gs4";
                break;
            case Note.A4:
                note = "A4";
                break;
            case Note.As4:
                note = "As4";
                break;
            case Note.B4:
                note = "B4";
                break;
            case Note.C5:
                note = "C5";
                break;
        }
        return note;
    }
    
    return Note;
}());
