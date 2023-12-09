---
title: "Storybook 腐らせない"
emoji: "📕"
type: "idea"
publication_name: "yumemi_inc"
topics: [Storybook, test, 自動テスト]
published: true
---

[![YUMEMI New Grad Advent Calendar 2023](https://storage.googleapis.com/zenn-user-upload/aa11e374f2f8-20231205.png)](https://qiita.com/advent-calendar/2023/yumemi-23-graduation)

この記事は [**株式会社ゆめみの23卒 Advent Calendar 2023**](https://qiita.com/advent-calendar/2023/yumemi-23-graduation) 8日目の記事です。

現代のWebフロントエンド開発において、コンポーネントの効率的な管理と可視化が求められる中、Storybookは開発者にとって欠かせないツールとなっています。Storybookは、コンポーネントをアプリケーションから隔離して単体で表示できるツールです。

https://storybook.js.org/docs/get-started/why-storybook

しかし、このように有用なStorybookが「腐ってしまう」ことがあります。この記事で「腐る」とは、コンポーネントをStorybookに表示するための設定であるStoryが最新の状態に更新されていない、またはプロジェクトにとって負債になっている状態を指します。例えば、以下のような状態が「腐っている」状態にあたります。


- `npm run storybook` するとそもそもエラーがでて表示されない
- Storyの存在しないコンポーネントやコンポーネントのユースケースが多数ある
- 実装とStoryの内容が乖離している

このような状態に陥ると、Storybookの本来の目的である効率的なコンポーネント管理とチーム間の共有が妨げられ、開発プロセスに支障をきたすことになります。

そこでこの記事では、Storybookが「腐らない」ように保つための方法を考察します。

## 前提：Storybookの利用状況

本記事では、以下のような前提の下でStorybookを使用することを想定しています。

- **アプリケーションのコードでの使用**
  - StorybookはウェブアプリケーションのUIコンポーネントを開発、テスト、共有するために使われることを想定します。
- **エンジニア以外は閲覧しない**
  - Storybookは主にアプリケーションを開発するエンジニアによって使用されることを想定します。

逆にStorybookが以下のように使用される場合はあまり想定していません。このような状況ではStorybookを更新していく動機が自然と生まれるため、この記事の内容は当てはまらない可能性があります。

- アプリケーションでなくデザインシステムライブラリの管理などに使用される場合
- デザイナー、プロジェクトマネージャー、プロダクトマネージャーなど、エンジニア以外の関係者がStorybookを閲覧する

## なぜ「腐る」のか

Storybookが「腐る」のは、主に以下のような原因があると考えられます。

### 自動テストが動いていない

StorybookのStoryを自動テストでチェックしていない場合、変更が適切に検知、反映されず、古い状態のまま放置されることがよくあります。動かしていないものは更新されません。このため、Storybookの有効性が低下し、最終的には「腐ってしまう」原因となります。

### 管理に手間がかかる

Storybookを維持するためには、実装ファイルとは別にStoryファイルを作成し、更新する必要があります。また、プロジェクトが大きくなるにつれて、特定のStoryを探すのも手間がかかるようになります。この作業は、特に大規模なプロジェクトにおいて開発メンバーの負担になります。これらがStoryの更新を怠る要因となることがあります。

### 目的が不明瞭

開発者の中で、Storybookを使用する具体的な目的について十分な合意を取っていないことがあります。例えば「既にアプリケーションでコンポーネントが表示されているのに、なぜStorybookが必要なのか」と疑問を抱くことがあります。さらに、Storyの管理はアプリケーションのコードに直接関わらない、つまりユーザーにとって直接のメリットにならないため、目的がわかりにくいと考えることもあります。目的が不明確になると、Storybookの更新や利用に対するモチベーションが失われ、その価値が見落とされがちになります。

## Storybook 腐らせない

先述したStorybookが「腐る」原因に対しては次の対処が考えられます。

### 自動テストを積極的に活用する

自動テストの不足がStorybookの「腐敗」を引き起こす主な原因の1つです。この問題を解決するためには、StorybookのStoryを定期的に自動テストすることが重要です。Storyをテストとして実行するには以下のような方法があります。


- [**Storybook test runner**](https://storybook.js.org/docs/writing-tests/test-runner)
  - ヘッドレスブラウザ（Playwright+Jest）で全てのStoryをテストする
  - **メリット:** ヘッドレスブラウザで動かすので結果はより信頼できる
  - **デメリット:** ヘッドレスブラウザのオーバーヘッドがある
  - **良さそうな使い方:** ローカル環境でレビュー前に走らせるなど
- **Vitest**
  - 記事 [Vitest(jsdom)でStorybookのStory全部テストする大作戦](https://zenn.dev/yumemi_inc/articles/run-all-stories-as-test-with-vitest-jsdom)
    - 私が書きました
  - Vitestで全てのStoryをテストする
  - **メリット:** ヘッドレスブラウザのオーバーヘッドがないので軽い（150以上あるコンポーネントのテストがキャッシュありだと3秒台くらい）
  - **デメリット:** 実際のユーザーの動作環境であるブラウザで実行していないので、テストの信頼性は落ちる
  - **良さそうな使い方:** CI、GitのHook（個人的にpre-commitだとWIPコミットなどで邪魔になるのでpre-pushで実行しています）など

Test RunnerやVitestなどのテストツールを使用すると、Storyが常に最新の状態で動作していることを確認できます。変更があった際に自動的に検知し、迅速に対応することが可能になります。


### 運用コストを減らす

Storybookの運用に手間がかかる問題を解決するためには、以下のような方法が考えられます。

#### Scaffoldツールでコンポーネントと一緒に作ってしまう

まずは（現状Storybookを使用できないサーバーコンポーネントを除いて）原則全てのコンポーネントでStoryを作ることの合意を取りましょう。

「Scaffold」は英語で「足場」を意味します。Scaffoldingツールは、コードを自動的に生成するツールです。

Scaffoldingツールを使うことで、開発者は新しいコンポーネントの基本構造と、それに伴うStoryファイルをすばやく簡単に、かつ一貫性を保って生成できます。

Scaffoldツールは例えば[scaffdog](https://scaff.dog/)、[Plop](https://plopjs.com/)、[TurborepoのCode Generator（`turbo gen`）](https://turbo.build/repo/docs/reference/command-line-reference/gen)、[Hygen](https://www.hygen.io/)などがあります。


https://scaff.dog/

https://plopjs.com/

https://turbo.build/repo/docs/reference/command-line-reference/gen

https://www.hygen.io/

TruborepoのCode Generation機能はPlopと似ているようです。

参考：
https://speakerdeck.com/shuta13/turborepo-code-generationniyoru-saibaezientogurupunohurontoendokai-fa-noxiao-lu-hua


#### Storybookをすぐ閲覧できる仕組みを作る

例えばStorybookをStoryファイルや実装ファイルから簡単に開けるVS Code拡張機能[Storybook Opener](https://github.com/ygkn/storybook-opener)があります。筆者が開発したVS Code拡張機能ですが、日頃便利に使っています（今見たら400以上インストールされてびびりました）。

https://github.com/ygkn/storybook-opener

https://marketplace.visualstudio.com/items?itemName=ygkn.storybook-opener

### 目的を明確にする

Storybookの目的が不明確であると、その価値が見落とされがちです。そのため、開発者がStorybookを使用する具体的な目的を理解し、共有することが重要です。



#### コンポーネントの挙動確認

Storybookは、UIコンポーネントが様々な条件下でどのように挙動するかを確認するのに理想的です。特に、エッジケースや異常系、準正常系のシナリオでは、実際のアプリケーションでのテストよりもStorybookでの確認が効率的です。

具体的には、Storybookやaddonの以下の機能を使用してエッジケースの確認が可能です。

- [`play()`](https://storybook.js.org/docs/writing-stories/play-function)関数を使用してユーザーが特定のインタラクションを行った状態を確認できる
- [msw-storybook-addon](https://storybook.js.org/addons/msw-storybook-addon) でAPIモックを行い、エラー状態、ローディング状態、結果が空の状態のUIを確認する

https://storybook.js.org/docs/writing-stories/play-function

https://storybook.js.org/addons/msw-storybook-addon

エッジケースの確認には、The UI Stackの各状態のStoryを作成しておくのがおすすめです。

https://www.gaji.jp/blog/2023/02/03/13707/

https://www.scotthurff.com/posts/why-your-user-interface-is-awkward-youre-ignoring-the-ui-stack/


フォームはユーザーの入力値が有効なときのみに`onSubmit`を発火するUI部分のコンポーネントと、`onSubmit`を受け通信などを行うコンポーネントに分けます。UI部分におけるコンポーネントでは、以下の状態をStoryとして作成すると良いでしょう。

- 初期状態
  - エラーメッセージが出ていないことを確認
- Invalid
  - ユーザー側のエラー。空のまま送信するなど
  - `onSubmit` が実行されていないこと、エラーメッセージが表示されていることを確認
- Valid
  - 正常系
  - `onSubmit` が入力内容で送信されていることを確認

通信などを行うコンポーネントでは、以下のStoryを作成すると良いでしょう。


- 初期状態
  - エラーメッセージが出ていないことを確認
- Success
  - 正常系
  - エラーメッセージが出ていないことを確認
- Error
  - サーバー側のエラー


これらのStoryを先述したScaffoldingツールのテンプレートに含めておくと良いでしょう。

#### アクセシビリティテスト

 Storybookには、アクセシビリティをテストするためのアドオンが用意されています。これにより、コンポーネントが自動的に検知できるアクセシビリティの問題を持っているかを簡単に確認できます。

https://storybook.js.org/addons/@storybook/addon-a11y

![スクリーンショット（画面イメージ）：Storybookで`form`コンポーネントを表示している。Canvasにフォームのレンダリング結果と、その下部の「Accessibility」パネルにてアクセシビリティチェックの結果が表示されている。結果は「1 Violations 12 Passes 0 Incomplete」であり、「Elements must meet minimum color contrast ratio thresholds」というエラーが表示されている。](https://storage.googleapis.com/zenn-user-upload/ec8d4ec65373-20231209.png)
:::message
このアドオンの中で使用されているアクセシビリティのチェックツール「axe」はChrome拡張機能など他の方法でも利用できます。Storybookのアドオンを使用する方法はコンポーネント単位で確認することになります。そのため、問題のコンポーネントの特定や、開発プロセスの中で細かな確認ができますが、コンポーネントを組み合わせることで起こる問題には気づきにくくなります。用途やプロセスに合わせて組み合わせると良いでしょう。
:::

#### レビュー支援

コードレビュー時にアプリケーションでの動作確認方法だけでなく、StorybookのURLを共有することで、レビュアーはコンポーネント単体で挙動を確認できます。これによりレビュープロセスがスムーズになります。

#### その他

その他にもビジュアルリグレッションテストや、プロトタイピングとしての活用など、Storybookを使用する目的はプロジェクトによって様々なものがあります。

例えば先月開催されたJSConf JP 2023では、株式会社カオナビのStorybookを活用した開発プロセスが紹介されました。とても参考になるので[スライド](https://speakerdeck.com/kinocoboy2/jsconfjp2023-storybookqu-dong-kai-fa-nozai-xian-xing-toxiao-lu-hua)や、[発表のアーカイブ（トラックD  2:38:40 あたりから）](https://www.youtube.com/watch?v=rDfPXDEot_A&t=9520s)をご覧ください。


https://jsconf.jp/2023/talk/workshop-kaonavi/

他にも「Storybook駆動開発」などというキーワードで検索すれば事例が見つかります。


## まとめ

この記事では、Storybookが更新されず、負債となる状態を防ぐため、以下の具体的な方法を考察しました。

- 自動テストを積極的に活用する
- 運用コストを減らす
- 目的を明確にする

この記事が、あなたのプロジェクトにおけるStorybookの活用を支援し、開発者体験を向上させる一助となれば幸いです。
