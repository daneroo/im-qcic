defmodule(Qcic.Nats) do
  @moduledoc """
  Nats Module
  """
  def show_nats do
    nats_url_host = "nats.ts.imetrical.com"
    nats_subject = "im.>"

    {:ok, gnat} = Gnat.start_link(%{host: nats_url_host, port: 4222})

    # Get the first message, any message
    # should we unsubscribe?
    {:ok, _subscription} = Gnat.sub(gnat, self(), nats_subject)

    nats_sub_output =
      receive do
        {:msg, %{body: body, topic: topic, reply_to: nil}} ->
          "#{topic}: #{body}"
      after
        # 10 seconds in milliseconds
        10_000 ->
          IO.puts("Timeout: No messages received within 10 seconds")
      end

    # Hack : nats-top is in my GOPATH/bin
    new_path = System.get_env("PATH") <> ":~/Code/Go/bin"

    {nats_top_output, 0} =
      System.cmd("/Users/daniel/Code/Go/bin/nats-top", ["-s", nats_url_host, "-o", "-"],
        env: [{"PATH", new_path}]
      )

    :ok = Gnat.stop(gnat)

    """
    ## NATS Section (#{nats_url_host})

    ### NATS Subscription (#{nats_subject})

    ```
    #{nats_sub_output}
    ```

    ### NATS Top:

    ```
    #{nats_top_output}
    ```

    """
  end
end
