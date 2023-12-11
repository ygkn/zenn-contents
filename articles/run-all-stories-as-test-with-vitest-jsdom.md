---
title: Vitest(jsdom)でStorybookのStory全部テストする大作戦
emoji: "🔖"
type: "tech"
publication_name: "yumemi_inc"
topics: [Storybook, Vitest]
published: true
---


[![YUMEMI New Grad Advent Calendar 2023](https://storage.googleapis.com/zenn-user-upload/aa11e374f2f8-20231205.png)](https://qiita.com/advent-calendar/2023/yumemi-23-graduation)

この記事は [**株式会社ゆめみの23卒 Advent Calendar 2023**](https://qiita.com/advent-calendar/2023/yumemi-23-graduation) 7日目の記事です。


## 今北産業

- ファイル `component.test.tsx` を置くと、Storybook test runnerのように全部のStoryのスモークテストとインタラクションテストがVitestとjsdomでできるよ！
- ヘッドレスブラウザを使わずにテストできるので、CIやGit hookなど実行時間を少なくしたいシチュエーションで使えるよ！
- でもブラウザで実行していないから複雑なインタラクションテストやアクセシビリティテストなど、一部のテストが不安定になるかもね！　考えて使い分けよう


https://github.com/ygkn/storybook-test-runner-jsdom/blob/5b2bac8a099300584a9f0fedc42a5bcd38585901/src/test/component.test.tsx

## Storybook をテストとして動かす

Storybookでは、Storyファイルの`play` 関数内にユーザのインタラクション（振る舞い）やアサーション（期待する結果）を記述することで、インタラクションテストを行うことができます。

https://storybook.js.org/docs/writing-tests/interaction-testing

例えば、次のコードはフォームがきちんと入力されている状態でsubmitできることを保証するテストです。

```tsx:form.stories.tsx
export const FullfilledSubmit: Story = {
  play: async ({ canvasElement, step, args }) => {
    const canvas = within(canvasElement);

    // 入力ステップ
    await step("input", async () => {
      // `Username` という名前がついた入力欄に `name` と入力する
      await userEvent.type(
        canvas.getByRole("textbox", { name: "Username" }),
        "name",
      );
    });

    // 送信ステップ
    await step("submit", async () => {
      // `Submit` という名前がついたボタンをクリックする
      await userEvent.click(canvas.getByRole("button", { name: "Submit" }));
    });

    // アサーションステップ
    await step("assert", async () => {
      await waitFor(async () => {
        // `onSubmit` propが「{ username: "name" }」というデータで送信されていることを確かめる
        await expect(args.onSubmit).toBeCalledWith(
          {
            username: "name",
          },
          expect.anything(),
        );
      });
    });
  },
};
```

このStoryを閲覧すると、次の画像のようにCanvas下の「Interactions」パネルにテストの実行結果が表示されます。ちゃんとPASSされていますね。

![スクリーンショット（画面イメージ）：Storybookのフォームコンポーネントテスト結果。StorybookのUIコンポーネントライブラリ内でのフォームコンポーネントのテスト結果が表示されている。フォームのレンダリング結果と、その下部の「Interactions」パネルにてテストの各ステップが「PASS」として緑色のテキストで表示されている。](https://storage.googleapis.com/zenn-user-upload/af5c9739d93a-20231207.png)

さらにこのインタラクションテストはStorybook test runnerによって、Playwright（ヘッドレスブラウザ）上で全てのテストを自動的に実行できるようになりました。

https://storybook.js.org/docs/writing-tests/test-runner

インタラクションテストとStorybook test runnerによって、JestやVitestといったテストツールで書いていたコンポーネントのテストをStorybookで実行できるようになります。これでStoryファイルとテストファイルを別々に管理する手間や、Storybookではテストができず、テストツールでは見た目が確認しにくいといった問題が解決されました。

Storybookのディスカッションでは、Storybook test runnerがjsdomベースになることは考えていない旨の発言があります。PlaywrightはJestと比較して、ブラウザでテストが実行されることから結果がより信頼できるものになること、速度の差はこのメリットと比較すれば無視できるほどであったことが理由のようです。

https://zenn.dev/makotot/articles/b0729488282148

https://github.com/storybookjs/storybook/discussions/16861#discussioncomment-2513340

しかし、VitestはPlaywrightと比べて十分速いと感じます（計測はしていません）。テストをCIやGit hook上などで頻繁に実行する場合は、実行時間の短縮が開発者体験の改善に繋がることから、Vitest上でStorybookのテストをしたいと考えました。

Vitest上でテストを実行するには、Vitest上でStoryファイルを再利用するという方法があります。Storybookでは、importされたStoryファイルをReact Testing Libraryで実行可能なコンポーネントに変換する関数が提供されており、これを使用する方法です。（`composeStory` 関数や`composeStories` 関数）しかし、これはStory1つづつに対してテストを記述しなければならないという問題がありました。これではStoryファイルとテストファイルを別々に管理する手間は減りません。

https://storybook.js.org/docs/writing-tests/stories-in-unit-tests

書籍『フロントエンド開発のためのテスト入門』「第8章　UIコンポーネントエクスプローラー」の最後では、以下のようにまとめられています。

> ### Jest でStoryを再利用するほうが優れている点
> - モジュールモックやスパイが必要なテストが書ける (Jestのモック関数を使用)
> - 実行速度が速い (ヘッドレスブラウザを使用しない)
> ### Test runner のほうが優れている点
> - テストファイルを別途用意しなくてもよい(工数が少ない)
> - 忠実性が高い(ブラウザを使用するのでCSS指定が再現される)

余談ですが、『フロントエンド開発のためのテスト入門』には先述した内容も詳細に解説されています。より詳しい情報をお求めの方はご参照ください。

https://www.shoeisha.co.jp/book/detail/9784798178639

---

だが……　今は違う！！（ｷﾞｭｯ）

## Storybook をテストとして「ブラウザの外で」動かす

ここではVitestで全てのStorybookのStoryをテストとして実行する方法を提案します。冒頭にも出てきたの `component.test.ts` がそれです。

https://github.com/ygkn/storybook-test-runner-jsdom/blob/5b2bac8a099300584a9f0fedc42a5bcd38585901/src/test/component.test.tsx


実際に`components.test.ts`を導入している例はリポジトリ[ygkn/storybook-test-runner-jsdom](https://github.com/ygkn/storybook-test-runner-jsdom)にあります。このリポジトリでVitestを実行すると、全てのStoryが実行されていることを確認できます。

```
$ npm run test

> storybook-test-runner-jest@0.1.0 test
> vitest


 DEV  v1.0.2 storybook-test-runner-jsdom

(node:92367) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
 ✓ src/test/component.test.tsx (6)
   ✓ 'src/components/ui/button.stories.tsx' (1)
     ✓ 'Default'
   ✓ 'src/components/ui/form.stories.tsx' (3)
     ✓ 'Default'
     ✓ 'EmptySubmit'
     ✓ 'FullfilledSubmit'
   ✓ 'src/components/ui/input.stories.tsx' (1)
     ✓ 'Default'
   ✓ 'src/components/ui/label.stories.tsx' (1)
     ✓ 'Default'

 Test Files  1 passed (1)
      Tests  6 passed (6)
   Start at  00:35:43
   Duration  769ms (transform 131ms, setup 172ms, collect 183ms, tests 54ms, environment 194ms, prepare 42ms)


 PASS  Waiting for file changes...
       press h to show help, press q to quit
```

実現方法は半ば力技で、Vitestの`import.meta.glob`で全てのStoryファイルを列挙し、それらを`composeStories`関数でテストとして実行しています。（`import.meta.glob`を使って全てのStoryファイルを列挙することは[Storybookのドキュメント「Storyshots migration guide」内「Configure the testing framework for portable stories」セクション](https://storybook.js.org/docs/writing-tests/storyshots-migration-guide#configure-the-testing-framework-for-portable-stories)でも記載されています。）

### 関数のモック

Storybookではreact-docgenを使用して`argTypes`（propの型情報）を取得しています（記事[Storybook と react-docgen の仕組みを追う](https://zenn.dev/sa2knight/articles/storybook_and_react_docgen)に詳細が書かれています）。この`argTypes`からActionsを生成しています（[Automatically matching args](https://storybook.js.org/docs/essentials/actions#automatically-matching-args)）。

Actionは、インタラクションテストでは関数のモックとして使用できます。先述の例で `onSubmit` propの呼び出しの確認していたのはこの機能によるものです。

自動でActionsを生成する機能はImplicit actionsと呼ばれています。Implicit actionsは、`composeStories`では使用できないため、以下のように自分で`argTypes`か`actions`を書く必要がありました。


```tsx
export default {
  component: Form,
  argTypes: {
    onSubmit: { onSubmit: {type: "function" } },
    // または
    onSubmit: { onSubmit: {action: "onSubmit" } },
  },
};
```

しかし、つい先日Storybook 7.6で以下のように以前より楽にactionを指定できる`@storybook/test`が導入されました。

```tsx
import { fn } from '@storybook/test';

export default {
  component: Form,
  args: {
    onSubmit: fn(),
  },
};
```

https://twitter.com/storybookjs/status/1724815595290378573

さらに、Implicit actionsはStorybook 8.0で非推奨になる予定です（Storybookのリポジトリ[MIGRATION.md](https://github.com/storybookjs/storybook/blob/1e933494b7e7167590dd928bfb293403a6e16fcc/MIGRATION.md)を参照）。

今から `@storybook/test`の `fn()` を使用しておくのが良いでしょう。


## 課題

この手法の既知の課題について述べます。

### コンポーネントやStoryファイルが編集された際にすべてのStoryが再実行される

`src/test/components.test.tsx` ファイルにて全てのStoryファイルを動的にimportしていることが原因と考えられます。

### Storybook上でPASSするテストがPASSしない

複雑なインタラクションテストや、一部のaddonを使用したStoryで発生する可能性があります。ブラウザやフレームワークのAPIのモックを`component.test.ts`や`setup.ts`にて行うと動く可能性があります。

どうしても動かないときは、`play`関数内で以下のように書いてVitest上での実行をスキップしています。この場合は、ブラウザのStorybook上で特に注意して確認するようにしています。

```ts
    // @ts-expect-error TODO: addon が vitest で動かないので暫定対応
    if (typeof import.meta.env !== 'undefined') {
      return;
    }
```


:::message
2023/12/12 追記

`vitest.testLevel` パラメータでテストレベルを設定する例を追加しました。

テストレベルは以下のものがあります。


1. **`none`**: そのStoryではテストを実行しない
2. **`smoke-only`**: Storyのレンダリング時にエラーが発生しないことのみをテストする
3. **`interaction`** Storyのレンダリング後、`play()` 関数も実行する

テストレベルは、Parameterで以下のように設定できるため`preview.tsx`（`preview.{t,j}s{,x}`）、meta、Storyで設定可能です。

```ts
// preview or meta or Story
{
    parameters: {
    vitest: {
      testLevel: "none",
    },
  },
}
```
:::

### アクセシビリティチェックの信頼性が落ちる

Storybook test runnerではaxe-playwrightを使用して、この手法ではvitest-axeを使用してアクセシビリティチェックを実行できます。

https://storybook.js.org/docs/writing-tests/accessibility-testing#automate-accessibility-tests-with-test-runner

https://github.com/chaance/vitest-axe

アクセシビリティのチェックはブラウザ上で実行しているStorybook test runnerのほうが信頼できます。もし結果に差異が出たらStorybook test runnerの結果を採用すると良いでしょう。

## まとめ

この記事では`components.test.ts`を用いてStorybookをVitest上でテストする方法について述べました。

Testing Trophyの話などでもよく言われるように、多くのテストの手法にはトレードオフが存在します。メリットとデメリットを把握してより良い開発者体験を目指していきましょう。


:::message
2023/12/12 追記

`@storybook/test` の `fn()` を使用していない場合は `play` 関数の実行時にActionを`fn()` に変換した `args` を渡す必要がありましたが、渡していませんでした。サンプルリポジトリの例を修正しました。
:::


