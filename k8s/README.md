# K8S for homelab

- [Homelab k8s (Evernote)](https://www.evernote.com/shard/s60/nl/6925909/0f1ce0c5-d777-4b44-9273-cf4f14b496d2/) 

TODO (Reading):

- [Brad's Homelab](https://github.com/bradfitz/homelab/)
- [K8S Local](https://github.com/yogeek/kubernetes-local-development)
- [Awesome K8S](https://ramitsurana.github.io/awesome-kubernetes/)
- [Microk8s for Kubeflow](https://www.kubeflow.org/docs/other-guides/virtual-dev/getting-started-multipass/)
- [MetalB addon](https://metallb.universe.tf/)
- [k3sup](https://blog.alexellis.io/raspberry-pi-homelab-with-k3sup/)
- [inlets operator](https://github.com/inlets/inlets-operator)

TODO:

- Get kubeconfig out of multipass uk8s/microk8s
- Get kubeconfig out of galois/microk8s

## Overview

The idea is to automate provisioning/setup of a local k8s cluster, and deploy qcic resources through pulumi to these clusters. I am testing this first on `galois` (*née `Shannon`*)

## Multipass

New work for `microk8s` is on `multipass` (instead of Vagrant), although that seems rather slow.

```bash
multipass launch lts -n uk8s -m 8G -d 40G -c 4
multipass shell uk8s
git clone https://github.com/canonical-labs/kubernetes-tools
sudo kubernetes-tools/setup-microk8s.sh
# Dashboard doesn't work yet
# sudo kubernetes-tools/expose-dashboard.sh
multipass stop uk8s
multipass delete uk8s
multipass list
multipass purge
```

## Microk8s

Use the setup script from canonical repo.

*There is something wrong with the dashboard option...*

```bash
git clone https://github.com/canonical-labs/kubernetes-tools
cd kubernetes-tools
export CHANNEL=stable
./setup-microk8s.sh
# If you'd like to expose the kubernetes dashboard, you can run the following:
./expose-dashboard.sh
```

Clean uninstall:

```bash
sudo snap unalias kubectl
sudo snap remove microk8s
```

## References

- [Previous work (gitlab)](https://gitlab.com/daneroo/canonical-microk8s-k3s)
  which was vagrant based, to bring up microk8s and k3s in vagrant.
- [MicroK8S](https://microk8s.io/#get-started)
- [Multipass](https://multipass.run/docs): brew installable
