---
title: "React Hook Form でラップコンポーネントを使ってらくらくフォーム作成"
emoji: "🎤"
type: "tech"
topics: [reacthookform, React, TypeScript]
published: true
---

[![YUMEMI New Grad Advent Calendar 2023](https://storage.googleapis.com/zenn-user-upload/aa11e374f2f8-20231205.png)](https://qiita.com/advent-calendar/2023/yumemi-23-graduation)

この記事は [**株式会社ゆめみの23卒 Advent Calendar 2023**](https://qiita.com/advent-calendar/2023/yumemi-23-graduation) 4日目の記事です。

React Hook Formを使用すると、Reactでバリデーションのできるパフォーマンスが高いフォームを効率的に作成できます。React Hook Form自体の詳細な解説は他に公式ドキュメントや記事があるので割愛します。

この記事では、React Hook Formが提供するAPIをラップしたコンポーネントを作成し、フォームの管理をより効率的に行う方法を提案します。この記事では仮にToDoリストを考えます。

このToDoリストのコードは [Codesandbox](https://codesandbox.io/p/github/ygkn/react-hook-form-with-wrapper-component/main) で参照、実行できます。


@[codesandbox](https://codesandbox.io/embed/github/ygkn/react-hook-form-with-wrapper-component/main?embed=1)


また、[GitHubリポジトリ ygkn/react-hook-form-with-wrapper-component](https://github.com/ygkn/react-hook-form-with-wrapper-component) で参照できます。

https://github.com/ygkn/react-hook-form-with-wrapper-component


この記事で紹介するコンポーネントは次の2つです。

1. `register` 関数をラップした `Registerer` コンポーネント
1. `useFieldArray` Hookをラップした `FieldArray` コンポーネント

## `Registerer` コンポーネント

React Hook Formでは、以下の2つの方法でフィールドを実装できます。

- `Controller` コンポーネントで制御コンポーネントとして実装する
- `register` 関数を用いて非制御コンポーネントで実装する

`register` 関数を用いて実装する方法は `Controller` コンポーネントを用いる方法に比べてパフォーマンス上有利ですが、次のように冗長な記述になることがあります。

```tsx:src/WhenThereIsNot.tsx
<div
  style={{
    display: "grid",
  }}
>
  <label className="visually-hidden">タイトル</label>
  <input
    type="text"
    // 😭 register、invalid、error で何回も name を書かなきゃいけない
    {...register(`todos.${index}.title`)}
    aria-invalid={
      // 😭
      formState.errors.todos?.[index]?.title !== undefined
    }
  />
  {/* 😭 一度 name を書いてるのに、同じ参照を object 形式で書かなきゃいけない */}
  {formState.errors.todos?.[index]?.title?.message !== undefined && (
    <span>
      error: {formState.errors.todos?.[index]?.title?.message}
    </span>
  )}
</div>
```

`register` 関数をラップした `Registerer` コンポーネントを使用すると、以下のように書けます。総行数は増えていますが、`name` を一度書けばいいようになりました。

```tsx:src/WhenThereIs.tsx
<Registerer
  name={`todos.${index}.title`}
  formState={formState}
  register={register}
  render={({ registration, fieldState }) => {
    return (
      <div
        style={{
          display: "grid",
        }}
      >
        <label className="visually-hidden">
          タイトル
        </label>
        <input
          type="text"
          {...registration}
          aria-invalid={fieldState.invalid}
        />
        {fieldState.error?.message !== undefined && (
          <span>
            error: {fieldState.error?.message}
          </span>
        )}
      </div>
    );
  }}
/>
```

`Registerer` を `register` 関数をラップしたコンポーネントは、以下のように定義しました。propの設計は `Controller` にインスピレーションを受けました。

https://github.com/ygkn/react-hook-form-with-wrapper-component/blob/cbf0a4cb4e6833d797a5118017d2aef3a1bd9143/src/utils/react-hook-form/Registerer.tsx

「なんで `Controller` だったらDRYに書けるのに `register` だとこんな冗長に書かなあかんねん！」と思ったことがコンポーネントを考えた経緯です。

## `FieldArray` コンポーネント

追加、削除が可能なToDoリストのような配列形式のフォームフィールドを作成するためにReact Hook Formでは `useFieldArray` APIが提供されています。

しかし、この `useFieldArray` APIはHookなので、条件分岐やループの中で使えないなどの制約（[Rules of Hooks](https://react.dev/warnings/invalid-hook-call-warning)）を受けます。2重の配列形式のフォームフィールドを作るときなどにはこの制約が不都合になる場合があります。

そこで、`useFieldArray` Hookをラップして`FieldArray` コンポーネントを作成します。

https://github.com/ygkn/react-hook-form-with-wrapper-component/blob/cbf0a4cb4e6833d797a5118017d2aef3a1bd9143/src/utils/react-hook-form/FieldArray.tsx

このコンポーネントを使用すると、次のように書けます。

```tsx
<FieldArray
  name="todos"
  control={control}
  render={({ append, fields, remove }) => {
    return (
      <>
        <ul
          style={{
            display: "grid",
            gap: "1rem",
          }}
        >
          {fields.map((field, index) => {
            return (
              <li
                key={field.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto",
                  gap: "0.5rem",
                  alignItems: "start",
                }}
              >
                <Controller
                  name={`todos.${index}.done`}
                  control={control}
                  render={({
                    field: { onChange, value, ...field },
                  }) => {
                    return (
                      <>
                        <input
                          type="checkbox"
                          id={`${formId}.todos.${index}.done`}
                          {...field}
                          checked={value}
                          onChange={(e) =>
                            onChange(e.currentTarget.checked)
                          }
                        />
                        <label
                          htmlFor={`${formId}.todos.${index}.done`}
                          className="visually-hidden"
                        >
                          完了
                        </label>
                      </>
                    );
                  }}
                />
                <Registerer
                  name={`todos.${index}.title`}
                  formState={formState}
                  register={register}
                  render={({ registration, fieldState }) => {
                    return (
                      <div
                        style={{
                          display: "grid",
                        }}
                      >
                        <label className="visually-hidden">
                          タイトル
                        </label>
                        <input
                          type="text"
                          {...registration}
                          aria-invalid={fieldState.invalid}
                        />
                        {fieldState.error?.message !== undefined && (
                          <span>
                            error: {fieldState.error?.message}
                          </span>
                        )}
                      </div>
                    );
                  }}
                />

                <button
                  type="button"
                  onClick={() => {
                    remove(index);
                  }}
                >
                  remove
                </button>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          onClick={() => {
            append({ title: "", done: false });
          }}
        >
          add
        </button>
      </>
    );
  }}
/>
```
