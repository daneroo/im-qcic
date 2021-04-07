# K8S for homelab

- [Homelab k8s (Evernote)](https://www.evernote.com/shard/s60/nl/6925909/0f1ce0c5-d777-4b44-9273-cf4f14b496d2/) 

TODO:

- Get kubeconfig out of multipass uk8s/microk8s
- Get kubeconfig out of galois/microk8s
- Pulumi to talk to any microk8s
  - <https://github.com/ubuntu/microk8s/issues/421>
- Mount Drobo inside a container
  - <https://community.spiceworks.com/topic/1896820-mounting-a-drobo-share-in-linux>
  - <https://stackoverflow.com/questions/27989751/mount-smb-cifs-share-within-a-docker-container>
  - <https://k8scifsvol.juliohm.com.br/>
    - or <https://github.com/Azure/kubernetes-volume-drivers>
    - or <https://github.com/fstab/cifs>

TODO (Reading):

- [Brad's Homelab](https://github.com/bradfitz/homelab/)
- [K8S Local](https://github.com/yogeek/kubernetes-local-development)
- [Awesome K8S](https://ramitsurana.github.io/awesome-kubernetes/)
- [Microk8s for Kubeflow](https://www.kubeflow.org/docs/other-guides/virtual-dev/getting-started-multipass/)
- [MetalB addon](https://metallb.universe.tf/)
- [k3sup](https://blog.alexellis.io/raspberry-pi-homelab-with-k3sup/)
- [inlets operator](https://github.com/inlets/inlets-operator)

## Overview

The idea is to automate provisioning/setup of a local k8s cluster, and deploy qcic resources through pulumi to these clusters. I am testing this first on `galois` (*née `Shannon`*)

## Multipass

New work for `microk8s` is on `multipass` (instead of Vagrant), although that seems rather slow.

```bash
multipass launch lts -n uk8s -m 8G -d 40G -c 4
multipass shell uk8s
# see Microk8s section below
multipass stop uk8s
multipass delete uk8s
multipass list
multipass purge
```

## Microk8s

Use the setup script from the canonical repo.

*There is something wrong with the dashboard option...*

```bash
git clone https://github.com/canonical-labs/kubernetes-tools
cd kubernetes-tools
export CHANNEL=stable # select version from: `snap info microk8s`
./setup-microk8s.sh
# If you'd like to expose the kubernetes dashboard, you can run the following:
./expose-dashboard.sh
```

### Remote Access

Get the `kubeconfig` file out of the remote.

```bash
multipass shell uk8s
microk8s.config >${HOSTNAME}.kubeconfig

multipass copy-files uk8s:uk8s.kubeconfig .

kubectl --kubeconfig uk8s.kubeconfig get nodes
KUBECONFIG=uk8s.kubeconfig kubectl get nodes

stern '.' --all-namespaces --kubeconfig uk8s.kubeconfig
KUBECONFIG=uk8s.kubeconfig stern '.' --all-namespaces
```

This might be a hint as to how to merge multiple configs, or just use many config files; just set `KUBECONFIG` to a colon separates list of kubeconfig files.
Also may have to edit names, or generate new credentials for new users, and avoid conflict in naming in multiple clusters:

```bash
export KUBECONFIG=uk8s.kubeconfig:~/.kube/config
kubectl config view --raw # prevent DATA+OMITTED, show raw certificate data.
kubectl get nodes

# this will set the `current-context` attribute in whichever file it got it from
# This depends on the merge rule when you have multiple config files.
kubectl config use-context minikube
kubectl config use-context microk8s
```

To configure the nodes individually, see <https://microk8s.io/docs/configuring-services>, microk8s uses templates (`/snap/microk8s/current`) to derive these config files:`/var/snap/microk8s/current`

### Clean uninstall

```bash
sudo snap unalias kubectl
sudo snap remove microk8s
```

## References

- [Previous work (gitlab)](https://gitlab.com/daneroo/canonical-microk8s-k3s)
  which was vagrant based, to bring up microk8s and k3s in vagrant.
- [MicroK8S](https://microk8s.io/#get-started)
- [Multipass](https://multipass.run/docs): brew installable
