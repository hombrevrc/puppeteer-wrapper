import puppeteer, { Page, Browser, Cookie } from "puppeteer";
import { existsSync } from "fs";
import del from "del";
import Jimp from "jimp";
import moment from "moment";
import { sleep } from "sleep";
export default class PuppeteerWrapper {
  constructor(private headless?: boolean, private slowMo?: number) {}
  private page?: Page;
  private browser?: Browser;
  private userDataDir: string = "./ChromeSettings";
  private defaultTimeout: number = 30000;
  async launch(): Promise<Page | undefined> {
    try {
      if (existsSync(this.userDataDir)) await del.sync(this.userDataDir);
      this.browser = await puppeteer.launch({
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        headless: this.headless ? this.headless : false,
        userDataDir: this.userDataDir,
        ignoreHTTPSErrors: true,
        slowMo: this.slowMo ? this.slowMo : 0
      });
      this.page = await this.browser.newPage();
      return this.page;
    } catch (error) {
      throw new Error(`Puppeteer Wrapper: ${error}`);
    }
  }

  async navigate(url: string, options?: { timeout?: number; waitForSec?: number }): Promise<void> {
    try {
      if (this.page) {
        if (options && options.waitForSec) await sleep(options.waitForSec);
        await this.page.goto(url, {
          timeout: options && options.timeout ? options.timeout : this.defaultTimeout,
          waitUntil: "networkidle2"
        });
      }
    } catch (error) {
      throw new Error(`Puppeteer Wrapper: ${error}`);
    }
  }

  async input(selector: string, value: string, options?: { timeout?: number; waitForSec?: number }): Promise<void> {
    try {
      if (this.page) {
        if (options && options.waitForSec) await sleep(options.waitForSec);
        await this.page.waitForSelector(selector, {
          visible: true,
          timeout: options && options.timeout ? options.timeout : this.defaultTimeout
        });
        await this.page.$eval(selector, (input: any) => (input.value = ""));
        await this.page.type(selector, value);
      }
    } catch (error) {
      throw new Error(`Puppeteer Wrapper: ${error}`);
    }
  }

  async click(selector: string, options?: { timeout?: number; waitForSec?: number }): Promise<void> {
    try {
      if (this.page) {
        await this.page.waitForSelector(selector, {
          visible: true,
          timeout: options && options.timeout ? options.timeout : this.defaultTimeout
        });
        await this.page.click(selector);
      }
    } catch (error) {
      throw new Error(`Puppeteer Wrapper: ${error}`);
    }
  }

  async login(params: {
    userNameSelector: string;
    userNameValue: string;
    passwordSelector: string;
    passwordValue: string;
    submitSelector: string;
    url: string;
  }): Promise<void> {
    try {
      const { userNameSelector, userNameValue, passwordSelector, passwordValue, submitSelector, url } = params;
      await this.navigate(url);
      await this.input(userNameSelector, userNameValue);
      await this.input(passwordSelector, passwordValue);
      await this.click(submitSelector);
    } catch (error) {
      throw new Error(`Puppeteer Wrapper: ${error}`);
    }
  }

  async html(html?: string, options?: { waitForSec?: number }): Promise<string | void> {
    try {
      if (this.page) {
        if (options && options.waitForSec) await sleep(options.waitForSec);
        if (html) this.page.setContent(html);
        else return await this.page.content();
      }
    } catch (error) {
      throw new Error(`Puppeteer Wrapper: ${error}`);
    }
  }

  async screenshot(options?: { waitForSec?: number }): Promise<string> {
    try {
      if (this.page) {
        if (options && options.waitForSec) await sleep(options.waitForSec);
        const input: Buffer = await this.page.screenshot({ fullPage: true });
        const image = await Jimp.read(input);
        await image.print(
          await Jimp.loadFont(Jimp.FONT_SANS_14_BLACK),
          image.bitmap.width - 160,
          image.bitmap.height - 20,
          moment().format("DD-MM-YYYY h:mm:ss a")
        );
        const output: Buffer = await image.getBufferAsync(Jimp.MIME_JPEG);
        return output.toString("base64");
      }
      return "";
    } catch (error) {
      throw new Error(`Puppeteer Wrapper: ${error}`);
    }
  }

  async cookies(options?: { url?: string; isObject?: boolean; waitForSec?: number }): Promise<any> {
    try {
      if (this.page) {
        if (options && options.waitForSec) await sleep(options.waitForSec);
        let cookies: Cookie[] = [];
        if (options && options.url) cookies = await this.page.cookies(options.url);
        else cookies = await this.page.cookies();
        cookies = await this.page.cookies();
        if (options && options.isObject === false)
          return cookies.map((cookie: Cookie) => `${cookie.name}=${cookie.value}`).join(";");
        return cookies;
      }
    } catch (error) {
      throw new Error(`Puppeteer Wrapper: ${error}`);
    }
  }

  async switchPage(pageIndex: number, options?: { waitForSec?: number }): Promise<void> {
    try {
      if (this.page && this.browser) {
        if (options && options.waitForSec) await sleep(options.waitForSec);
        let pages: Page[] = await this.browser.pages();
        let secCounter: number = 0;
        while (pages.length <= pageIndex) {
          pages = await this.browser.pages();
          await sleep(1);
          secCounter += 1;
          if (secCounter === 60) throw new Error(`Puppeteer Wrapper: Cannot switch to Page index:${pageIndex}`);
        }
        this.page = pages[pageIndex];
      }
    } catch (error) {
      throw new Error(`Puppeteer Wrapper: ${error}`);
    }
  }
}
