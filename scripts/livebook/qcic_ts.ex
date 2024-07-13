defmodule QCIC_TS do
  def find_tailscale_command do
    case System.find_executable("tailscale") do
      nil ->
        other_paths = [
          "/Applications/Tailscale.app/Contents/MacOS/Tailscale",
          "/volume1/@appstore/Tailscale/bin/tailscale"
        ]

        Enum.reduce_while(other_paths, {:error, "Tailscale command is not available"}, fn path,
                                                                                          acc ->
          case System.cmd("sh", ["-c", "test -x #{path}"]) do
            {_, 0} -> {:halt, {:ok, path}}
            _ -> {:cont, acc}
          end
        end)

      path ->
        {:ok, path}
    end
  end

  def show_tailscale do
    case find_tailscale_command() do
      {:ok, tailscale_cmd} ->
        check_tailscale_status(tailscale_cmd)

      {:error, reason} ->
        render_error(reason)
    end
  end

  defp check_tailscale_status(tailscale_cmd) do
    {status_text, 0} = System.cmd(tailscale_cmd, ["status", "--peers=false"])
    status_text = String.trim(status_text)

    if status_text == "Tailscale is stopped." do
      """
      ## Tailscale Identity
      - Tailscale is stopped.
      """
    else
      render_tailscale_info(tailscale_cmd)
    end
  end

  defp render_tailscale_info(tailscale_cmd) do
    {my_tailscale_ipv4, 0} = System.cmd(tailscale_cmd, ["ip", "--4"])
    my_tailscale_ipv4 = String.trim(my_tailscale_ipv4)

    {whois_text, 0} = System.cmd(tailscale_cmd, ["whois", my_tailscale_ipv4])
    whois_text = String.trim(whois_text)

    tailscale_hostname =
      whois_text
      |> String.split("\n")
      |> Enum.find(&String.contains?(&1, "Name:"))
      |> String.split(":")
      |> Enum.at(1)
      |> String.trim()

    {status_json, 0} = System.cmd(tailscale_cmd, ["status", "--json"])
    status_data = Jason.decode!(status_json)
    peers = Map.values(status_data["Peer"])

    peer_table = render_peer_table(peers)
    active_peer_table = render_active_peer_table(peers, tailscale_cmd)

    """
    ## Tailscale Identity
    - Tailscale IP: #{my_tailscale_ipv4}
    - Tailscale Hostname: #{tailscale_hostname}

    ## Tailscale Status (Peers)
    #{peer_table}
    #{active_peer_table}
    """
  end

  defp render_peer_table(peers) do
    peer_rows =
      [
        "| Host                 | IP Address      | Online |",
        "| -------------------- | --------------- | ------ |"
      ] ++
        Enum.map(peers, fn peer ->
          host_name = peer["HostName"]
          online = peer["Online"]
          ip = List.first(peer["TailscaleIPs"])
          "| #{host_name} | #{ip} | #{online} |"
        end)

    "\n### All peers\n\n" <> Enum.join(peer_rows, "\n") <> "\n"
  end

  defp render_active_peer_table(peers, tailscale_cmd) do
    active_peers = Enum.filter(peers, fn peer -> peer["Online"] end)

    active_peer_rows =
      ([
         "| Host                 | IP Address      | Online | Via                  | Delay   |",
         "| -------------------- | --------------- | ------ | -------------------- | ------- |"
       ] ++
         Enum.map(active_peers, fn peer ->
           host_name = peer["HostName"]
           ip = List.first(peer["TailscaleIPs"])

           case System.cmd("sh", [
                  "-c",
                  "#{tailscale_cmd} ping -c 1 --timeout 5s --until-direct=false #{ip}"
                ]) do
             {pong_result, 0} ->
               if String.contains?(pong_result, "timed out") do
                 ""
               else
                 via =
                   pong_result
                   |> String.split(" via ")
                   |> Enum.at(1)
                   |> String.split(" in ")
                   |> Enum.at(0)

                 delay = pong_result |> String.split(" in ") |> Enum.at(1) |> String.trim()
                 "| #{host_name} | #{ip} | true | #{via} | #{delay} |"
               end

             _ ->
               ""
           end
         end))
      |> Enum.reject(&(&1 == ""))

    """
    ### Active peers

    #{Enum.join(active_peer_rows, "\n")}
    """
  end

  defp render_error(reason) do
    """
    ## Tailscale Error
    - Error: #{reason}
    """
  end
end
