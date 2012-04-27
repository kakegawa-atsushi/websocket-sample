import java.io.IOException;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * プレーヤーの管理を行うマネージャークラスです。
 * 
 * <p>クライアント間の連携処理を受け持ちます。</p>
 */
public class PlayerManager {
    
    /** logger */
    private static final Logger LOGGER = LoggerFactory.getLogger(PlayerManager.class);
    
    /** 現在参加しているプレーヤーのリスト */
    private List<Player> players = new CopyOnWriteArrayList<Player>();
    
    /**
     * プレーヤーを追加します。
     * 
     * @param player 追加するプレーヤー
     */
    public void addPlayer(Player player) {
        players.add(player);
    }
    
    /**
     * プレーヤーを削除します。
     * 
     * @param player 削除するプレーヤー
     */
    public void removePlayer(Player player) {
        players.remove(player);
    }
    
    /**
     * 各プレーヤーのクライアントから受け取ったイベントデータを処理します。
     * 
     * @param receivedPlayer イベントデータを受け取ったプレーヤー
     * @param receivedData イベントデータ
     */
    public void messageReceived(Player receivedPlayer, PlayerEvent receivedData) {
        // イベントデータを受け取ったプレーヤーのクライアントIDをセット
        receivedData.id = receivedPlayer.getId();
        // イベントデータを受け取ったプレーヤー以外にデータを送信
        broadcastToOtherPlayers(receivedPlayer, receivedData);
    }
    
    /**
     * 指定されたプレーヤー以外のプレーヤーにデータを送信します。
     * 
     * @param excludePlayer データ送信対象外のプレーヤー
     * @param data 送信するデータ
     */
    private void broadcastToOtherPlayers(Player excludePlayer, PlayerEvent data) {
        for (Player player : players) {
            if (player == excludePlayer) {
                continue;
            }
            try {
                player.sendData(data);
            } catch (IOException e) {
                LOGGER.error(e.getMessage());
            }
        }
    }
}
