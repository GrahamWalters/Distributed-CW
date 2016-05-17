# Distributed-CW

Design and implementation of a Secure and Reliable Cloud Data Storage Platform

## Background
According to Cloudability’s data from its 3,200 customers in 80 different countries, 86% of companies used more than one type of Cloud service in 2012. Particularly, with the ever increasing demands of storing and processing Big Data, 72% of companies use Cloud storage services to varying degrees.

Without doubt, Cloud computing provides enterprises with a long list of benefits, such as saving on capital and operational costs, improving scalability and flexibility, and reducing the carbon footprint. However, just as a coin has two sides, Cloud computing also comes with a few inherent disadvantages, primarily around data security and reliability. The Cloud Security Alliance published a report in 2013, identifying “data breaches” and “data loss” as the top two threats towards Cloud computing security.

Hence, significant research effort has been made in the literature to develop a Cloud data storage platform in which users can securely store critical information, ensuring that it persists, is continuously accessible, and is kept confidential. Conventional encryption and replication strategies can be applied in combination to enhance data security and reliability simultaneously. However, such approaches can result in considerable overheads in terms of processing power, network bandwidth, storage space, and key management. In comparison, keyless secret sharing schemes demonstrate advantages in many different ways, and thus are becoming increasingly popular.

Secret Sharing refers to methods for distributing a secret amongst a group of participants, each of whom is allocated a “share” of the secret. The secret can be reconstructed only when a sufficient number of shares are combined together, while individual shares are of no use on their own. At the first glance, a secret sharing scheme is quite similar to a RAID system which splits a file and distributes data stripes over multiple hard disks with a certain level of redundancy, so that it can tolerate the failure of a small number of disk drives. Actually, a secret sharing scheme is more advanced than a RAID system, because of its:

- Flexibility – an arbitrary threshold T can be configured, so only T shares are required to recover a file when it was originally split into N shares. For this reason, a secret sharing scheme is also called a T- out-of-N scheme, while the loss of (N-T) shares can be tolerated.
- Security – a secret sharing scheme is built on top of a mathematical foundation which guarantees that no information about the original data can be obtained from any combinations of less than T shares. Contrarily, the splitting method used by a RAID system tends to be much simpler, and thus it is not able to afford strong security features.

## System Design
This coursework aims to produce a feasible design of a secure and reliable Cloud data storage platform using a secret sharing scheme. The system should meet the following key functional requirements:
 1. The system should provide a front-end component (namely the “Interface”) that allows user registration. An existing user should be able to log in to the system and manage her profile, including the configuration of N and T values, as well as to upload and download files. Other useful functionalities can be introduced as appropriate.
 2. The system should provide a back-end component (namely the “Engine”) that both splits a file into secret shares and combines secret shares back into the original file. [Note: The lecturer will provide useful libraries in Java and C# in due course.]
 3. The system should provide another back-end component (namely the “Cloudlet”) that serves as a bridge between the Engine and an actual Cloud storage infrastructure, providing the low-level CRUD (create, read, update, and delete) operations for the secret shares.

## System Implementation
According to the system design, you should have implemented the following components:
- Interface – a front-end component that allows the registration of new users, management of existing users’ profiles, and functional requirements like the uploading and downloading of files.
- Engine – a back-end component that is able to split a file into secret shares and combines the shares back into the original file.
- Cloudlet – a back-end component that handles low-level CRUD operations of secret shares.
- Non-functional requirements – technical solutions to the top three non-functional issues identified during the system design.
 
For each of the components you are expected to demonstrate:
- Correctness – the component actually works fine, 15 marks.
- Deployment – the component is properly hosted, 5 marks.
- Understanding – the ability of articulating various technical details, 5 marks.
