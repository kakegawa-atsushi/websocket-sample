package jp.classmethod.websocketsample;
import javax.servlet.ServletContext;
import javax.servlet.ServletContextEvent;
import javax.servlet.ServletContextListener;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * サーブレットコンテキストのリスナクラスです。
 */
public class ApplicationServletContextListener implements ServletContextListener {

    /** logger */
    private static final Logger LOGGER = LoggerFactory.getLogger(ApplicationServletContextListener.class);
    
    @Override
    public void contextDestroyed(ServletContextEvent event) {
        LOGGER.info("contextDestroyed.");
    }

    @Override
    public void contextInitialized(ServletContextEvent event) {
        // プレーヤーマネージャーを生成してコンテキストに格納
        ServletContext context = event.getServletContext();
        PlayerManager manager = new PlayerManager();
        context.setAttribute("playerManager", manager);
        LOGGER.info("contextInitialized.");
    }

}
