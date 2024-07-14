defmodule Qcic.Identity do
  @moduledoc """
  Host Identity Module
  """

  def show_identity do
    {hostname_fqdn, 0} = System.cmd("hostname", ["-f"])
    {hostname_short, 0} = System.cmd("hostname", ["-s"])
    {uname, 0} = System.cmd("uname", [])

    uname = String.trim(uname)

    active_interface_cmd =
      case uname do
        "Darwin" -> "route get default | grep interface | awk '{print $2}'"
        _ -> "ip route | grep default | awk '{print $5}'"
      end

    {active_interface, 0} = System.cmd("sh", ["-c", active_interface_cmd])
    active_interface = String.trim(active_interface)

    my_ip_cmd =
      case uname do
        "Darwin" -> "ipconfig getifaddr #{active_interface}"
        _ -> "ip -4 addr show #{active_interface} | grep -oP '(?<=inet\\s)\\d+(\\.\\d+){3}'"
      end

    {my_ip, 0} = System.cmd("sh", ["-c", my_ip_cmd])
    my_ip = String.trim(my_ip)

    """
    ## Identity (#{String.trim(hostname_short)})
    - Hostname: #{String.trim(hostname_fqdn)}
    - IP Address: #{my_ip}
    """
  end
end
