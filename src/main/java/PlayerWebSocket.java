import java.io.IOException;

import net.arnx.jsonic.JSON;

import org.eclipse.jetty.websocket.WebSocket.OnTextMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * WebSocketのイベントをハンドルして処理を行うクラスです。
 * 
 * <p>他のクライアントとの連携はPlayerManagerに任せています。</p>
 */
public class PlayerWebSocket implements OnTextMessage, Player {
    
    /** logger */
    private static final Logger LOGGER = LoggerFactory.getLogger(PlayerWebSocket.class);
    
    /** プレーヤーマネージャー */
    private final PlayerManager manager;
    /** クライアントID */
    private final String id;
    /** WebSocketコネクション */
    private Connection connection;
    
    /**
     * コンストラクタです。
     * 
     * @param manager プレーヤーマネージャー
     * @param id クライアントID
     */
    public PlayerWebSocket(PlayerManager manager, String id) {
        this.manager = manager;
        this.id = id;
    }

    @Override
    public void onClose(int closeCode, String message) {
        LOGGER.info(String.format("Open a connection. ID:%s", id));
        // プレーヤーを削除
        manager.removePlayer(this);
    }

    @Override
    public void onOpen(Connection connection) {
        LOGGER.info(String.format("Close a connection. ID:%s", id));
        this.connection = connection;
        // プレーヤーを追加
        manager.addPlayer(this);
    }

    @Override
    public void onMessage(String data) {
        LOGGER.info(String.format("Receive a message. data: %s", data));
        // データをJSONからデシリアライズ
        PlayerEvent receivedData = JSON.decode(data, PlayerEvent.class);
        // データの受信をマネージャーに通知
        manager.messageReceived(this, receivedData);
    }

    @Override
    public String getId() {
        return id;
    }

    @Override
    public void sendData(PlayerEvent data) throws IOException {
        // データをJSONにシリアライズ
        String message = JSON.encode(data);
        // クライアントにデータを送信
        connection.sendMessage(message);
        LOGGER.info(String.format("Send a message. data: %s", data));
    }

}
