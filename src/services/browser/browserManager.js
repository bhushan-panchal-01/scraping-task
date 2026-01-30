const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const logger = require('../../utils/logger');
const config = require('../../config/config');
const ProxyConfig = require('./proxyConfig');

// Add stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

class BrowserManager {
  constructor() {
    this.browser = null;
    this.isLaunching = false;
    this.launchPromise = null;
  }

  /**
   * Get or create browser instance (Singleton pattern)
   * @returns {Promise<Browser>}
   */
  async getBrowser() {
    // If browser exists and is connected, return it
    if (this.browser && this.browser.isConnected()) {
      return this.browser;
    }

    // If browser is currently launching, wait for it
    if (this.isLaunching && this.launchPromise) {
      return this.launchPromise;
    }

    // Launch new browser
    return this.launchBrowser();
  }

  /**
   * Launch a new browser instance
   * @returns {Promise<Browser>}
   */
  async launchBrowser() {
    this.isLaunching = true;

    try {
      logger.info('Launching Puppeteer browser...');

      const launchOptions = this.buildLaunchOptions();
      this.launchPromise = puppeteer.launch(launchOptions);
      this.browser = await this.launchPromise;

      logger.info('Browser launched successfully');

      // Handle browser disconnect
      this.browser.on('disconnected', () => {
        logger.warn('Browser disconnected');
        this.browser = null;
        this.isLaunching = false;
        this.launchPromise = null;
      });

      return this.browser;
    } catch (error) {
      logger.error(`Failed to launch browser: ${error.message}`);
      this.browser = null;
      throw error;
    } finally {
      this.isLaunching = false;
    }
  }

  /**
   * Build launch options for Puppeteer
   * @returns {Object} Launch options
   */
  buildLaunchOptions() {
    const { browser: browserConfig, proxy: proxyConfig } = config.webScraping;

    const args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      `--window-size=${browserConfig.viewport.width},${browserConfig.viewport.height}`,
    ];

    // Add proxy arguments only if explicitly enabled AND host is configured
    // Proxy is optional - only needed for server environment to avoid rate limits
    if (proxyConfig.enabled && proxyConfig.host) {
      const proxyArgs = ProxyConfig.formatProxyArgs(proxyConfig);
      if (proxyArgs && proxyArgs.args) {
        args.push(...proxyArgs.args);
        logger.info(`Proxy enabled for browser: ${proxyConfig.host}:${proxyConfig.port}`);
      }
    } else {
      logger.debug('Proxy not enabled for browser - running without proxy');
    }

    return {
      headless: browserConfig.headless,
      args,
      defaultViewport: {
        width: browserConfig.viewport.width,
        height: browserConfig.viewport.height,
      },
      ignoreHTTPSErrors: true,
    };
  }

  /**
   * Create a new page with configured settings
   * @returns {Promise<Page>}
   */
  async createPage() {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    // Set user agent
    await page.setUserAgent(config.webScraping.browser.userAgent);

    // Set extra HTTP headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    });

    // Set timeout
    page.setDefaultTimeout(config.webScraping.browser.timeout);
    page.setDefaultNavigationTimeout(config.webScraping.browser.timeout);

    // Handle proxy authentication only if proxy is explicitly enabled and configured
    const { proxy: proxyConfig } = config.webScraping;
    if (proxyConfig.enabled && proxyConfig.host) {
      const credentials = ProxyConfig.getAuthCredentials(proxyConfig);
      if (credentials) {
        await page.authenticate(credentials);
        logger.debug('Proxy authentication configured for page');
      }
    }

    return page;
  }

  /**
   * Close browser instance
   */
  async closeBrowser() {
    if (this.browser) {
      try {
        logger.info('Closing browser...');
        await this.browser.close();
        this.browser = null;
        this.isLaunching = false;
        this.launchPromise = null;
        logger.info('Browser closed successfully');
      } catch (error) {
        logger.error(`Error closing browser: ${error.message}`);
      }
    }
  }

  /**
   * Get random delay for anti-detection
   * @returns {number} Delay in milliseconds
   */
  getRandomDelay() {
    const { min, max } = config.webScraping.delays;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Wait for random delay (anti-detection)
   * @returns {Promise<void>}
   */
  async randomDelay() {
    const delay = this.getRandomDelay();
    logger.debug(`Waiting ${delay}ms for anti-detection...`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Check if browser is running
   * @returns {boolean}
   */
  isRunning() {
    return this.browser && this.browser.isConnected();
  }
}

// Export singleton instance
module.exports = new BrowserManager();
