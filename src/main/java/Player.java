import java.io.IOException;


/**
 * キーボードセッションに参加しているプレーヤーを表すインターフェースです。
 */
public interface Player {

    /**
     * プレイヤーのクライアントIDを返します。
     * 
     * @return クライアントID
     */
    public String getId();
    
    /**
     * プレイヤーにデータを送信します。
     * 
     * @param data イベントデータ
     * @throws IOException
     */
    public void sendData(PlayerEvent data) throws IOException;
    
}
